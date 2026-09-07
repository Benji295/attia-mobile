import { View, Text, Pressable, Dimensions, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  FadeOut,
  FadeInUp,
  ZoomIn,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming
} from "react-native-reanimated";
import ConfettiCannon from "react-native-confetti-cannon";
import { rankActivities, getPersonalityProfile, matchReason } from "../../lib/scoring/recommendations";
import { getActivities } from "../../lib/places/fetchActivities";
import { computeXp, levelInfo, firesItineraryBuilt, FULL_DAY_MIN_STOPS } from "../../lib/gamification";
import { hapticLight, hapticSuccess, isHighMatch, prefersReducedMotion } from "../../lib/feedback";
import {
  matchTier,
  trackActivitySaved,
  trackActivitySkipped,
  trackItineraryBuilt,
  trackFilterApplied
} from "../../lib/analytics";
import { cityLabel } from "../../lib/cities";
import { color, screen } from "../../lib/theme";
import { CitySelector } from "../../components/CitySelector";
import { DiscoverFilters, DEFAULT_FILTERS, type Filters, type FilterDim } from "../../components/DiscoverFilters";
import { ActivityCard } from "../../components/ActivityCard";
import { PlaceDetailOverlay } from "../../components/PlaceDetailOverlay";
import { type Activity, type RankedActivity } from "../../types";
import { useAttia } from "../../lib/store";

const SCREEN_W = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_W * 0.3; // distance past which a release commits
const OFF_SCREEN = SCREEN_W * 1.5; // where a committed card flies to
const SAVE_CUE_COLOR = getPersonalityProfile("explorer").accent; // Explorer green, from the locked palette
// Palette-honest confetti colors for the Tier-2 high-match burst.
const CELEBRATE_COLORS = [
  getPersonalityProfile("explorer").accent,
  getPersonalityProfile("socialite").accent,
  getPersonalityProfile("connector").accent,
  color.brand
];

export default function Discover() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { result, saved, activeSaved, cityId, toggleSave, isSaved, cacheActivities } = useAttia();
  const [ci, setCi] = useState(0);
  const translateX = useSharedValue(0);
  /**
   * The open place detail (OAT-44). Pure state — the overlay is mounted or it
   * is not. No route, no sheet library, no animation gates its visibility.
   */
  const [detail, setDetail] = useState<RankedActivity | null>(null);

  // Live data state.
  const [data, setData] = useState<Activity[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Fetch live activities for the active city (re-runs on city change + retry).
  // Cache them so Saved/Itinerary resolve saved ids from the same set. Cities
  // explored now derives from saves (OAT-61), so nothing is marked here.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setCi(0); // start the new city's deck from the top
    getActivities(cityId)
      .then((list) => {
        if (!active) return;
        setData(list);
        cacheActivities(list);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cityId, reloadKey, cacheActivities]);

  const ranked = useMemo(
    () => (result && data ? rankActivities(data, cityId, result.scores, result) : []),
    [result, data, cityId]
  );

  // Per-session filters (default All; not persisted). Narrow the ranked deck
  // client-side, preserving the personality ranking order within the subset.
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const filtersActive =
    filters.vibe !== "All" || filters.budget !== "All" || filters.setting !== "All" || filters.dayPart !== "All";

  const filtered = useMemo(
    () =>
      ranked.filter((r) => {
        const a = r.activity;
        if (filters.vibe !== "All" && a.vibe !== filters.vibe) return false;
        if (filters.budget !== "All" && a.priceLevel !== filters.budget) return false;
        if (filters.setting !== "All" && a.setting !== filters.setting) return false;
        if (filters.dayPart !== "All" && a.dayPart !== filters.dayPart) return false;
        return true;
      }),
    [ranked, filters]
  );

  // Each new card mounts centered.
  useEffect(() => {
    translateX.value = 0;
  }, [ci, translateX]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotateZ: `${interpolate(translateX.value, [-SCREEN_W, 0, SCREEN_W], [-8, 0, 8])}deg` }
    ]
  }));

  const saveCueStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP)
  }));

  const skipCueStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP)
  }));

  // ---- Celebration feedback state (OAT-15) ----
  // Each trigger carries a monotonically increasing `seq` so re-firing with the
  // same payload still replays the entering animation. One of each at a time —
  // a new save supersedes the previous, so saves never pile into a chaos of
  // overlapping effects.
  const seq = useRef(0);
  const [xpChip, setXpChip] = useState(0); // seq, or 0 = hidden
  const [flash, setFlash] = useState<{ seq: number; pct: number } | null>(null); // Tier 2
  const [toast, setToast] = useState<{ seq: number; msg: string } | null>(null); // Tier 4
  const [burst, setBurst] = useState(0); // seq, or 0 = none
  const heartScale = useSharedValue(1);

  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));

  useEffect(() => {
    if (xpChip === 0) return;
    const t = setTimeout(() => setXpChip(0), 1000);
    return () => clearTimeout(t);
  }, [xpChip]);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1200);
    return () => clearTimeout(t);
  }, [flash]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1900);
    return () => clearTimeout(t);
  }, [toast]);

  // Header reused across content states — title + city selector.
  const Header = (
    <>
      <View className="flex-row items-baseline justify-between">
        <Text
          className="font-display-medium text-text"
          style={{ fontSize: 30, lineHeight: 30 * 1.15, letterSpacing: 30 * -0.015 }}
        >
          Discover
        </Text>
        {/* Scoped to the deck you're browsing — a DC count over a Miami deck was
            the same lie the Itinerary header told. */}
        {activeSaved.length > 0 && (
          <Text className="font-display text-meta" style={{ fontSize: 11.5 }}>
            {activeSaved.length} saved
          </Text>
        )}
      </View>
      <View className="mt-3 mb-4">
        <CitySelector />
      </View>
    </>
  );

  if (!result) {
    return (
      <View
        className="flex-1 bg-bg items-center justify-center"
        style={{ paddingTop: Math.max(screen.top, insets.top), paddingHorizontal: screen.x }}
      >
        <Ionicons name="compass-outline" size={34} color={color.dim} />
        <Text className="font-display text-muted mt-3 text-center" style={{ fontSize: 14 }}>
          Take the quiz to unlock your matches.
        </Text>
        <Pressable
          onPress={() => router.push("/quiz")}
          className="mt-5 rounded-list active:opacity-80"
          style={{ backgroundColor: color.text, paddingHorizontal: 24, paddingVertical: 15 }}
        >
          <Text className="font-display-medium" style={{ fontSize: 15.5, color: color.bg }}>
            Take the quiz
          </Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View
        className="flex-1 bg-bg"
        style={{ paddingTop: Math.max(screen.top, insets.top), paddingHorizontal: screen.x }}
      >
        {Header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={color.muted} />
          <Text className="font-display text-dim mt-3" style={{ fontSize: 13 }}>
            Finding your matches in {cityLabel(cityId)}…
          </Text>
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View
        className="flex-1 bg-bg"
        style={{ paddingTop: Math.max(screen.top, insets.top), paddingHorizontal: screen.x }}
      >
        {Header}
        <View className="flex-1 items-center justify-center">
          <Ionicons name="cloud-offline-outline" size={34} color={color.dim} />
          <Text
            className="font-display text-muted mt-3 text-center"
            style={{ fontSize: 14, lineHeight: 14 * 1.5, maxWidth: 260 }}
          >
            We couldn't load activities. Check your connection and try again.
          </Text>
          <Pressable
            onPress={() => setReloadKey((k) => k + 1)}
            className="mt-5 rounded-list active:opacity-80"
            style={{ backgroundColor: color.text, paddingHorizontal: 24, paddingVertical: 15 }}
          >
            <Text className="font-display-medium" style={{ fontSize: 15.5, color: color.bg }}>
              Retry
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const ranItem = filtered[ci];

  function applyFilter(dim: FilterDim, value: string) {
    setFilters((f) => ({ ...f, [dim]: value }));
    setCi(0); // re-rank from the top of the filtered set
    if (value !== "All") trackFilterApplied(dim, value); // not on "All" (clear)
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setCi(0);
  }

  /**
   * Toggle a save, with its analytics and celebration — and NOTHING about the
   * deck (OAT-44). The detail overlay saves the card the user is reading, which
   * must not also skip it; advance() owns moving the deck on, this owns the save.
   */
  function saveActivity(activity: Activity, match: number) {
    const id = activity.id;
    const wasSaved = isSaved(id);
    toggleSave(id); // stamps the active city at write time
    // Celebrate + track only an actual ADD (not an un-save of a re-encounter).
    if (wasSaved) return;
    // GLOBAL — XP, level and the Collector badge are a cumulative per-user
    // score, and the celebration escalates on the same count so a toast can
    // never contradict what Profile shows.
    const beforeCount = saved.length;
    // PER-CITY — a plan lives in one city (see firesItineraryBuilt).
    const beforeInCity = activeSaved.length;
    celebrateSave(match, beforeCount);
    trackActivitySaved({
      activityId: id,
      category: activity.category,
      matchPercent: match,
      matchTier: matchTier(match, ranked.map((r) => r.match)),
      city: cityId,
      cityId
    });
    // itinerary_built once, on this city's 2 -> 3 transition. Three saves
    // spread across three cities is not a plan and must not fire it.
    if (firesItineraryBuilt(beforeInCity)) trackItineraryBuilt(beforeInCity + 1);
  }

  function advance(save: boolean) {
    if (ranItem) {
      if (save) {
        saveActivity(ranItem.activity, ranItem.match);
      } else {
        trackActivitySkipped({ activityId: ranItem.activity.id, matchPercent: ranItem.match });
      }
    }
    setCi((c) => c + 1);
  }

  // Tiered feedback for a save. Exactly one haptic per save (the strongest that
  // applies); Tier 1 visuals always; Tier 2 burst/flash on a relative high match;
  // Tier 4 toast on a level-up or badge unlock — sequenced AFTER a Tier 2 burst
  // so the two never collide. `beforeCount` = saved length before this add.
  function celebrateSave(matchValue: number, beforeCount: number) {
    const n = ++seq.current;

    // Tier 1 — always: +XP chip + heart pulse.
    setXpChip(n);
    heartScale.value = withSequence(withTiming(1.3, { duration: 120 }), withSpring(1));

    // Tier 2 — relative high match (top 15% of the user's own match range).
    const high = isHighMatch(matchValue, ranked.map((r) => r.match));

    // Tier 4 — level-up / badge unlock, computed from the gamification engine.
    const after = beforeCount + 1;
    const leveledUp = levelInfo(computeXp(true, after)).level > levelInfo(computeXp(true, beforeCount)).level;
    // Save-driven badges (Collector + Day maker) both unlock at the full-day
    // threshold; surface one if newly crossed.
    const newBadge =
      beforeCount < FULL_DAY_MIN_STOPS && after >= FULL_DAY_MIN_STOPS ? "Collector" : null;
    const newLevel = levelInfo(computeXp(true, after)).level;

    const big = high || leveledUp || !!newBadge;
    if (big) hapticSuccess();
    else hapticLight();

    if (high) {
      setFlash({ seq: n, pct: matchValue });
      if (!prefersReducedMotion()) setBurst(n);
    }

    if (leveledUp || newBadge) {
      const msg = leveledUp ? `Level ${newLevel}!` : `Badge unlocked: ${newBadge}`;
      if (high) setTimeout(() => setToast({ seq: n, msg }), 700); // sequence after the burst
      else setToast({ seq: n, msg });
    }
  }

  // Single shared path for both tap and swipe: fling the card off-screen, then
  // advance once the animation lands and snap back to center for the next card.
  function dismiss(save: boolean) {
    translateX.value = withTiming(save ? OFF_SCREEN : -OFF_SCREEN, { duration: 220 }, (finished) => {
      if (finished) runOnJS(finishDismiss)(save);
    });
  }

  function finishDismiss(save: boolean) {
    translateX.value = 0;
    advance(save);
  }

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_THRESHOLD) {
        runOnJS(dismiss)(true);
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        runOnJS(dismiss)(false);
      } else {
        translateX.value = withSpring(0);
      }
    });

  return (
    <View
      className="flex-1 bg-bg"
      style={{ paddingTop: Math.max(screen.top, insets.top), paddingHorizontal: screen.x }}
    >
      {Header}

      <View className="mb-3">
        <DiscoverFilters filters={filters} onChange={applyFilter} />
      </View>

      {filtered.length === 0 && filtersActive ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="filter-outline" size={34} color={color.dim} />
          <Text
            className="font-display text-muted mt-3 text-center"
            style={{ fontSize: 14, maxWidth: 260 }}
          >
            No matches with these filters — loosen one.
          </Text>
          <Pressable
            onPress={clearFilters}
            className="mt-5 rounded-list active:opacity-80"
            style={{ backgroundColor: color.text, paddingHorizontal: 24, paddingVertical: 15 }}
          >
            <Text className="font-display-medium" style={{ fontSize: 15.5, color: color.bg }}>
              Clear filters
            </Text>
          </Pressable>
        </View>
      ) : ranItem ? (
        <>
          <GestureDetector gesture={pan}>
            <Animated.View style={[{ flex: 1 }, cardStyle]}>
              <ActivityCard
                activity={ranItem.activity}
                match={ranItem.match}
                highlight={isHighMatch(ranItem.match, ranked.map((r) => r.match))}
                highlightAccent={getPersonalityProfile(result.dominant).accent}
                highlightAccentSoft={getPersonalityProfile(result.dominant).accentSoft}
                reason={matchReason(ranItem.activity, result.dominant)}
                onPress={() => setDetail(ranItem)}
                photoOverlay={
                  <>
                    {/* Directional drag cues — only the relevant one fades in. */}
                    <Animated.View style={[{ position: "absolute", top: 12, left: 12 }, saveCueStyle]}>
                      <Ionicons name="checkmark-circle" size={42} color={SAVE_CUE_COLOR} />
                    </Animated.View>
                    <Animated.View style={[{ position: "absolute", top: 12, left: 12 }, skipCueStyle]}>
                      <Ionicons name="close-circle" size={42} color={color.dim} />
                    </Animated.View>
                  </>
                }
              />
            </Animated.View>
          </GestureDetector>

          <View className="flex-row justify-center items-center py-4" style={{ gap: 34 }}>
            <Pressable
              onPress={() => dismiss(false)}
className="bg-surface border border-line rounded-pill items-center justify-center active:scale-95"
              style={{ width: 62, height: 62 }}
            >
              <Ionicons name="close" size={28} color={color.muted} />
            </Pressable>
            <Pressable
              onPress={() => dismiss(true)}
className="bg-surface border border-line rounded-pill items-center justify-center active:scale-95"
              style={{ width: 62, height: 62 }}
            >
              <Animated.View style={heartStyle}>
                <Ionicons
                  name={isSaved(ranItem.activity.id) ? "heart" : "heart-outline"}
                  size={26}
                  color={color.brand}
                />
              </Animated.View>
            </Pressable>
          </View>
        </>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="checkmark-done-outline" size={34} color={color.dim} />
          <Text className="font-display text-muted mt-3" style={{ fontSize: 14 }}>
            That's your ATTIA for today.
          </Text>
          <Pressable onPress={() => setCi(0)} className="mt-4">
            <Text className="font-display text-dim" style={{ fontSize: 13 }}>
              Start over
            </Text>
          </Pressable>
        </View>
      )}

      {/* Tier 1 — "+10 XP" chip floats up near the action buttons. */}
      {xpChip > 0 && (
        <Animated.View
          key={`xp-${xpChip}`}
          entering={FadeInUp.duration(260)}
          exiting={FadeOut.duration(260)}
          pointerEvents="none"
          style={{ position: "absolute", left: 0, right: 0, bottom: 96, alignItems: "center" }}
        >
          <View
className="flex-row items-center rounded-pill"
            style={{
              gap: 3,
              paddingHorizontal: 12,
              paddingVertical: 5,
              backgroundColor: color.surface,
              borderWidth: 1,
              borderColor: SAVE_CUE_COLOR
            }}
          >
            <Ionicons name="add" size={14} color={SAVE_CUE_COLOR} />
            <Text className="font-display-medium" style={{ fontSize: 13, color: SAVE_CUE_COLOR }}>
              10 XP
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Tier 2 — "Perfect match!" flash over the card. */}
      {flash && (
        <Animated.View
          key={`flash-${flash.seq}`}
          entering={ZoomIn.duration(280)}
          exiting={FadeOut.duration(300)}
          pointerEvents="none"
          style={{ position: "absolute", left: 0, right: 0, top: 230, alignItems: "center" }}
        >
          <View
            className="rounded-list"
            style={{ backgroundColor: SAVE_CUE_COLOR, paddingHorizontal: 16, paddingVertical: 10 }}
          >
            <Text className="font-display-medium" style={{ fontSize: 15, color: color.bg }}>
              Perfect match! {flash.pct}%
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Tier 4 — level-up / badge toast (top). */}
      {toast && (
        <Animated.View
          key={`toast-${toast.seq}`}
          entering={FadeInUp.duration(260)}
          exiting={FadeOut.duration(260)}
          pointerEvents="none"
          style={{ position: "absolute", left: 0, right: 0, top: insets.top + 56, alignItems: "center" }}
        >
          <View
            className="flex-row items-center bg-surface border border-line rounded-pill"
            style={{ gap: 6, paddingHorizontal: 16, paddingVertical: 9 }}
          >
            <Ionicons name="trophy" size={16} color={color.brand} />
            <Text className="font-display-medium text-text" style={{ fontSize: 13 }}>
              {toast.msg}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Place detail (OAT-44). An in-place overlay gated purely on state —
          no route, no sheet library, nothing behind an animation callback.
          Saving from here uses saveActivity, so the card underneath is NOT
          skipped: the user stays exactly where they were. */}
      {detail && (
        <PlaceDetailOverlay
          activity={detail.activity}
          reason={matchReason(detail.activity, result.dominant)}
          isSaved={isSaved(detail.activity.id)}
          onSave={() => saveActivity(detail.activity, detail.match)}
          onClose={() => setDetail(null)}
        />
      )}

      {/* Tier 2 — particle burst around the card (skipped under Reduce Motion). */}
      {burst > 0 && !prefersReducedMotion() && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiCannon
            key={`burst-${burst}`}
            count={35}
            origin={{ x: SCREEN_W / 2, y: 240 }}
            colors={CELEBRATE_COLORS}
            fadeOut
            autoStart
            explosionSpeed={320}
            fallSpeed={2400}
          />
        </View>
      )}
    </View>
  );
}
