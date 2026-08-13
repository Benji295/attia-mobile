import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { quizQuestions } from "../data/quiz";
import { scoreQuiz } from "./scoring/recommendations";
import { trackAppOpened } from "./analytics";
import { DEFAULT_CITY } from "./cities";
import type { Activity, QuizResult } from "../types";

// Single namespaced key holding the whole persisted blob. Bump the version
// suffix if the shape ever changes incompatibly. New fields (e.g. OAT-14's
// streak/lastActiveDate) just get added to PersistedBlob + the write-through.
const STORAGE_KEY = "attia:v1";

/**
 * Schema marker inside the attia:v1 record (OAT-61). Absent === 1.
 *   1 → saved was `string[]`: an activity id with no city, so a save resolved
 *       against whatever city you happened to be viewing (the Miami-save-in-a-
 *       DC-itinerary bug).
 *   2 → saved is `SavedEntry[]`: every save carries the city it was made in.
 * The marker is what makes the legacy migration run exactly once.
 */
export const SCHEMA_VERSION = 2;

/**
 * One saved place. `cityId` is stamped AT WRITE TIME from activeCityId() — the
 * scoping lives in the data, not in the query, so no read path can ever leak a
 * save into another city's list.
 *
 * OAT-21 (per-day quick-add) extends this same entry with `day` / `slot`; there
 * is no plan-entry model yet, so an itinerary stop IS a save (the Itinerary tab
 * derives from this list).
 */
export type SavedEntry = {
  /** Activity id. */
  id: string;
  /** City the place was found in. */
  cityId: string;
};

type PersistedBlob = {
  /** OAT-61 migration marker. Absent on records written before this ships. */
  schemaVersion: number;
  result: QuizResult | null;
  saved: SavedEntry[];
  activityCache: Record<string, Activity>;
  // Gamification (OAT-14). XP/level are DERIVED from state (see lib/gamification),
  // so they are not stored; streak + lastActiveDate are not derivable, so they are.
  streak: number;
  lastActiveDate: string | null; // local day key, e.g. "2026-6-9"
  // City selector (OAT-20B). The active city.
  cityId: string;
  /**
   * Cities explored, kept as a monotonic FLOOR (OAT-61). Pre-OAT-61 this was
   * written when a city's data merely LOADED, so testers earned City hopper by
   * browsing; the displayed value now unions this with the cities derived from
   * saves. Preserved on migration and never shrunk — an earned badge must never
   * un-earn.
   */
  citiesExplored: string[];
};

type AttiaState = {
  /** false until the initial AsyncStorage load completes */
  hydrated: boolean;
  result: QuizResult | null;
  /**
   * EVERY save, across every city. This is the global truth that XP, level and
   * cities-explored are computed from (Snapchat-score model — never scoped).
   * Screens that render a list want `activeSaved` instead.
   */
  saved: SavedEntry[];
  /** Saves in the active city — what Saved / Itinerary / Home render. */
  activeSaved: SavedEntry[];
  /** Saves living under OTHER cities (drives the Saved tab cross-trip notice). */
  savedElsewhereCount: number;
  /** Activities seen this session, keyed by id — persisted so Saved/Itinerary
      resolve saved ids on a cold start before any new live fetch. */
  activityCache: Record<string, Activity>;
  /** Consecutive-day launch streak, updated once per launch after hydration. */
  streak: number;
  /**
   * Cities explored — global, never scoped, never shrinks (City hopper badge).
   * The union of the persisted floor and the cities derived from ALL saves.
   */
  citiesExplored: string[];
  /**
   * THE one source of truth for which city the app is scoped to. Every read and
   * every write path goes through this — no screen reads the city another way.
   * OAT-63 repoints this at trip.city; that is a one-line change, here only.
   */
  activeCityId: () => string;
  /** answers: map of quiz question id -> chosen option id */
  finishQuiz: (answers: Record<string, string>) => QuizResult | null;
  /** Save/un-save in the active city. Stamps cityId at write time. */
  toggleSave: (id: string) => void;
  /** Is this activity saved IN THE ACTIVE CITY? */
  isSaved: (id: string) => boolean;
  cacheActivities: (list: Activity[]) => void;
  setCity: (id: string) => void;
  reset: () => void;
};

// ---------------------------------------------------------------------------
// Pure scoping helpers. The provider is a thin wrapper over these, and the
// OAT-61 regression tests drive these same functions — so a test passing means
// the shipped read/write path is the one under test.
// ---------------------------------------------------------------------------

/** Saves belonging to one city. */
export function savedInCity(saved: SavedEntry[], cityId: string): SavedEntry[] {
  return saved.filter((e) => e.cityId === cityId);
}

/** Is `id` saved in `cityId`? Matches on BOTH — an id alone is not an identity. */
export function isSavedInCity(saved: SavedEntry[], id: string, cityId: string): boolean {
  return saved.some((e) => e.id === id && e.cityId === cityId);
}

/** Add (stamped with `cityId`) or remove. The write-time stamp is the whole fix. */
export function toggleSavedEntry(saved: SavedEntry[], id: string, cityId: string): SavedEntry[] {
  return isSavedInCity(saved, id, cityId)
    ? saved.filter((e) => !(e.id === id && e.cityId === cityId))
    : [...saved, { id, cityId }];
}

/** Distinct cities the user has saved in, in first-save order. Global by design. */
export function citiesExploredFrom(saved: SavedEntry[]): string[] {
  const seen: string[] = [];
  for (const e of saved) if (!seen.includes(e.cityId)) seen.push(e.cityId);
  return seen;
}

/**
 * Merge city sets, preserving order and dropping duplicates. Used to union the
 * persisted floor with the cities derived from saves, so cities-explored only
 * ever grows — a badge earned by browsing before OAT-61 stays earned.
 */
export function unionCities(...sets: string[][]): string[] {
  const out: string[] = [];
  for (const set of sets) for (const c of set) if (c && !out.includes(c)) out.push(c);
  return out;
}

/** How many saves sit under a city other than `cityId`. */
export function countSavedElsewhere(saved: SavedEntry[], cityId: string): number {
  return saved.reduce((n, e) => (e.cityId === cityId ? n : n + 1), 0);
}

/**
 * One-time legacy migration (OAT-61). A v1 record holds `saved: string[]` — ids
 * with no city — so every legacy entry gets stamped with the city that is active
 * at migration time (the record's own `cityId`, falling back to DEFAULT_CITY).
 *
 * Nothing is dropped: an entry that already carries a valid cityId is left
 * exactly as-is, which is also what makes this idempotent. Re-running on an
 * already-migrated record stamps nothing and reports 0. The stored
 * citiesExplored set is carried through untouched — it is the floor that keeps
 * a City hopper badge earned by browsing (pre-OAT-61) from un-earning.
 *
 * Returns the normalized blob plus how many entries were stamped.
 */
export function migrateBlob(
  raw: unknown,
  fallbackCityId: string = DEFAULT_CITY
): { blob: PersistedBlob; migrated: number } {
  const src = (raw && typeof raw === "object" ? raw : {}) as Partial<PersistedBlob> & {
    saved?: unknown;
    citiesExplored?: unknown;
  };

  // The city active at migration time — what legacy saves get stamped with.
  const activeAtMigration = typeof src.cityId === "string" && src.cityId ? src.cityId : fallbackCityId;

  const saved: SavedEntry[] = [];
  let migrated = 0;
  if (Array.isArray(src.saved)) {
    for (const entry of src.saved) {
      // v1: a bare id string.
      if (typeof entry === "string") {
        if (!entry) continue;
        saved.push({ id: entry, cityId: activeAtMigration });
        migrated++;
        continue;
      }
      // v2: already an entry. Stamp it only if the city is missing/unusable, so
      // a half-written record self-heals instead of orphaning the save.
      if (entry && typeof entry === "object") {
        const e = entry as Partial<SavedEntry>;
        if (typeof e.id !== "string" || !e.id) continue;
        if (typeof e.cityId === "string" && e.cityId) {
          saved.push({ id: e.id, cityId: e.cityId });
        } else {
          saved.push({ id: e.id, cityId: activeAtMigration });
          migrated++;
        }
      }
    }
  }

  return {
    blob: {
      schemaVersion: SCHEMA_VERSION,
      result: src.result ?? null,
      saved,
      activityCache:
        src.activityCache && typeof src.activityCache === "object" ? src.activityCache : {},
      // Carried through, never discarded — this is the badge floor.
      citiesExplored: Array.isArray(src.citiesExplored)
        ? src.citiesExplored.filter((c): c is string => typeof c === "string" && !!c)
        : [],
      streak: typeof src.streak === "number" ? src.streak : 0,
      lastActiveDate: typeof src.lastActiveDate === "string" ? src.lastActiveDate : null,
      cityId: activeAtMigration
    },
    migrated
  };
}

// Local calendar-day key (not UTC) so "today/yesterday" match the user's clock.
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const AttiaContext = createContext<AttiaState | null>(null);

export function AttiaProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [saved, setSaved] = useState<SavedEntry[]>([]);
  const [activityCache, setActivityCache] = useState<Record<string, Activity>>({});
  const [streak, setStreak] = useState(0);
  const [lastActiveDate, setLastActiveDate] = useState<string | null>(null);
  const [cityId, setCityId] = useState<string>(DEFAULT_CITY);
  // Monotonic floor for cities-explored: legacy browse-based data, plus every
  // city ever saved in. Only ever grows, so a badge can never un-earn.
  const [citiesExploredFloor, setCitiesExploredFloor] = useState<string[]>([]);

  // Mirror the active city in a ref so activeCityId() is right even when a write
  // fires from a callback captured on an earlier render (e.g. the swipe
  // animation's runOnJS hop in Discover). Assigned during render, so a write
  // that happens after setCity always reads the new city.
  const cityRef = useRef(cityId);
  cityRef.current = cityId;

  const activeCityId = useCallback(() => cityRef.current, []);

  // Rehydrate once on mount, then advance the launch streak exactly once.
  useEffect(() => {
    let active = true;
    (async () => {
      let loadedStreak = 0;
      let loadedLast: string | null = null;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && active) {
          // Everything goes through migrateBlob — it both normalizes the record
          // and stamps any legacy save. Runs once: after this the write-through
          // persists schemaVersion 2 and there is nothing left to stamp.
          const { blob, migrated } = migrateBlob(JSON.parse(raw));
          if (migrated > 0) {
            console.log(
              `[attia] OAT-61 migration: stamped ${migrated} legacy save${migrated === 1 ? "" : "s"} with cityId "${blob.cityId}" (schema ${SCHEMA_VERSION})`
            );
          }
          setResult(blob.result);
          setSaved(blob.saved);
          setActivityCache(blob.activityCache);
          // Stored set survives the upgrade — City hopper stays earned.
          setCitiesExploredFloor(blob.citiesExplored);
          loadedStreak = blob.streak;
          loadedLast = blob.lastActiveDate;
          setCityId(blob.cityId);
          cityRef.current = blob.cityId;
        }
      } catch {
        // Corrupt/unavailable storage: fall back to a fresh session.
      }
      if (!active) return;

      // Streak: same day → unchanged; yesterday → +1; gap/first run → 1.
      const now = new Date();
      const today = dayKey(now);
      const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
      let nextStreak: number;
      if (loadedLast === today) nextStreak = loadedStreak || 1;
      else if (loadedLast === yesterday) nextStreak = loadedStreak + 1;
      else nextStreak = 1;
      setStreak(nextStreak);
      setLastActiveDate(today);

      setHydrated(true);
      trackAppOpened(); // app_opened — once per launch, after hydration
    })();
    return () => {
      active = false;
    };
  }, []);

  // Write through whenever any persisted field changes — but only after the
  // initial load, so we never clobber stored data with the empty initial state.
  // The first write after an upgrade is what persists the migration.
  useEffect(() => {
    if (!hydrated) return;
    const blob: PersistedBlob = {
      schemaVersion: SCHEMA_VERSION,
      result,
      saved,
      activityCache,
      streak,
      lastActiveDate,
      cityId,
      citiesExplored: citiesExploredFloor
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(blob)).catch(() => {});
  }, [hydrated, result, saved, activityCache, streak, lastActiveDate, cityId, citiesExploredFloor]);

  // A city you have saved in is explored forever. Folding save-cities into the
  // persisted floor keeps the badge earned even if the user later un-saves every
  // stop there. Returns `prev` unchanged when there is nothing new, so this
  // never loops.
  useEffect(() => {
    if (!hydrated) return;
    setCitiesExploredFloor((prev) => {
      const next = unionCities(prev, citiesExploredFrom(saved));
      return next.length === prev.length ? prev : next;
    });
  }, [hydrated, saved]);

  // Compute the result with the real scoring engine (scoreQuiz), not a tally.
  const finishQuiz = (answers: Record<string, string>) => {
    const next = scoreQuiz(quizQuestions, answers);
    setResult(next);
    return next;
  };

  // The city is read at write time, from the one accessor.
  const toggleSave = useCallback(
    (id: string) => setSaved((s) => toggleSavedEntry(s, id, activeCityId())),
    [activeCityId]
  );

  const isSaved = useCallback((id: string) => isSavedInCity(saved, id, cityId), [saved, cityId]);

  const activeSaved = useMemo(() => savedInCity(saved, cityId), [saved, cityId]);
  const savedElsewhereCount = useMemo(() => countSavedElsewhere(saved, cityId), [saved, cityId]);
  // Global by design (OAT-61 §6): every city the user has saved in, not just the
  // active one — unioned with the persisted floor so legacy browse-based data
  // still counts and the value never shrinks. Unioned here rather than read
  // straight off the floor so a brand-new save counts on THIS render, not the
  // next one.
  const citiesExplored = useMemo(
    () => unionCities(citiesExploredFloor, citiesExploredFrom(saved)),
    [citiesExploredFloor, saved]
  );

  const cacheActivities = useCallback((list: Activity[]) => {
    setActivityCache((prev) => {
      const next = { ...prev };
      for (const a of list) next[a.id] = a;
      return next;
    });
  }, []);

  const setCity = (id: string) => {
    cityRef.current = id; // keep the accessor exact even before the re-render
    setCityId(id);
  };

  const reset = () => {
    setResult(null);
    setSaved([]);
    // The floor is monotonic through normal use — un-saving never shrinks it —
    // but Reset is a deliberate wipe, not normal use. Without this, a tester who
    // retakes the quiz keeps City hopper on a profile with zero saves. The
    // save-city effect below re-runs with an empty `saved` and leaves it empty,
    // and the write-through persists the cleared floor.
    setCitiesExploredFloor([]);
  };

  return (
    <AttiaContext.Provider
      value={{
        hydrated,
        result,
        saved,
        activeSaved,
        savedElsewhereCount,
        activityCache,
        streak,
        citiesExplored,
        activeCityId,
        finishQuiz,
        toggleSave,
        isSaved,
        cacheActivities,
        setCity,
        reset
      }}
    >
      {children}
    </AttiaContext.Provider>
  );
}

export function useAttia() {
  const ctx = useContext(AttiaContext);
  if (!ctx) throw new Error("useAttia must be used inside <AttiaProvider>");
  return ctx;
}
