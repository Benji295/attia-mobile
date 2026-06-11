import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { quizQuestions } from "../data/quiz";
import { scoreQuiz } from "./scoring/recommendations";
import { trackAppOpened } from "./analytics";
import type { Activity, QuizResult } from "../types";

// Single namespaced key holding the whole persisted blob. Bump the version
// suffix if the shape ever changes incompatibly. New fields (e.g. OAT-14's
// streak/lastActiveDate) just get added to PersistedBlob + the write-through.
const STORAGE_KEY = "attia:v1";

type PersistedBlob = {
  result: QuizResult | null;
  saved: string[];
  activityCache: Record<string, Activity>;
  // Gamification (OAT-14). XP/level are DERIVED from state (see lib/gamification),
  // so they are not stored; streak + lastActiveDate are not derivable, so they are.
  streak: number;
  lastActiveDate: string | null; // local day key, e.g. "2026-6-9"
};

type AttiaState = {
  /** false until the initial AsyncStorage load completes */
  hydrated: boolean;
  result: QuizResult | null;
  saved: string[];
  /** Activities seen this session, keyed by id — persisted so Saved/Itinerary
      resolve saved ids on a cold start before any new live fetch. */
  activityCache: Record<string, Activity>;
  /** Consecutive-day launch streak, updated once per launch after hydration. */
  streak: number;
  /** answers: map of quiz question id -> chosen option id */
  finishQuiz: (answers: Record<string, string>) => QuizResult | null;
  toggleSave: (id: string) => void;
  cacheActivities: (list: Activity[]) => void;
  reset: () => void;
};

// Local calendar-day key (not UTC) so "today/yesterday" match the user's clock.
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const AttiaContext = createContext<AttiaState | null>(null);

export function AttiaProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [activityCache, setActivityCache] = useState<Record<string, Activity>>({});
  const [streak, setStreak] = useState(0);
  const [lastActiveDate, setLastActiveDate] = useState<string | null>(null);

  // Rehydrate once on mount, then advance the launch streak exactly once.
  useEffect(() => {
    let active = true;
    (async () => {
      let loadedStreak = 0;
      let loadedLast: string | null = null;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && active) {
          const blob = JSON.parse(raw) as Partial<PersistedBlob>;
          if (blob.result !== undefined) setResult(blob.result);
          if (Array.isArray(blob.saved)) setSaved(blob.saved);
          if (blob.activityCache && typeof blob.activityCache === "object") {
            setActivityCache(blob.activityCache);
          }
          if (typeof blob.streak === "number") loadedStreak = blob.streak;
          if (typeof blob.lastActiveDate === "string") loadedLast = blob.lastActiveDate;
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
  useEffect(() => {
    if (!hydrated) return;
    const blob: PersistedBlob = { result, saved, activityCache, streak, lastActiveDate };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(blob)).catch(() => {});
  }, [hydrated, result, saved, activityCache, streak, lastActiveDate]);

  // Compute the result with the real scoring engine (scoreQuiz), not a tally.
  const finishQuiz = (answers: Record<string, string>) => {
    const next = scoreQuiz(quizQuestions, answers);
    setResult(next);
    return next;
  };

  const toggleSave = (id: string) =>
    setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const cacheActivities = useCallback((list: Activity[]) => {
    setActivityCache((prev) => {
      const next = { ...prev };
      for (const a of list) next[a.id] = a;
      return next;
    });
  }, []);

  const reset = () => {
    setResult(null);
    setSaved([]);
  };

  return (
    <AttiaContext.Provider
      value={{ hydrated, result, saved, activityCache, streak, finishQuiz, toggleSave, cacheActivities, reset }}
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
