import { View, Text, Pressable, Dimensions, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
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
import { photoUri, accentFor } from "../../lib/activities/display";
import { computeXp, levelInfo, FULL_DAY_MIN_STOPS } from "../../lib/gamification";
import { hapticLight, hapticSuccess, isHighMatch, prefersReducedMotion } from "../../lib/feedback";
import {
  matchTier,
  trackActivitySaved,
  trackActivitySkipped,
  trackItineraryBuilt,
  trackFilterApplied,
  trackQuickAddItinerary
} from "../../lib/analytics";
import { cityLabel } from "../../lib/cities";
import { CitySelector } from "../../components/CitySelector";
import { DiscoverFilters, DEFAULT_FILTERS, type Filters, type FilterDim } from "../../components/DiscoverFilters";
import { type Activity } from "../../types";
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
  "#FB923C"
];

// UI-only mapping from activity category to an Ionicons glyph (photo fallback).
const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Water Activities": "water-outline",
  "Wine Bars": "wine-outline",
  Art: "color-palette-outline",
  Rooftops: "business-outline",
  Dining: "restaurant-outline",
  "Food Tours": "fast-food-outline",
  "Outdoor Sports": "bicycle-outline",
  "Shared Tables": "people-outline",
  "City Guides": "map-outline",
  Performance: "musical-notes-outline"
};

export default function Discover() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { result, saved, cityId, toggleSave, cacheActivities, markCityExplored } = useAttia();
  const [ci, setCi] = useState(0);
  const translateX = useSharedValue(0);

  // Live data state.
  const [data, setData] = useState<Activity[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Fetch live activities for the selected city (re-runs on city change + retry).
  // Cache them so Saved/Itinerary resolve saved ids from the same set, and mark
  // the city explored (City hopper badge).
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
        markCityExplored(cityId);
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
  }, [cityId, reloadKey, cacheActivities, markCityExplored]);

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
        <Text className="text-2xl font-medium text-neutral-900">Discover</Text>
        {saved.length > 0 && <Text className="text-xs text-neutral-400">{saved.length} saved</Text>}
      </View>
      <View className="mt-3 mb-4">
        <CitySelector />
      </View>
    </>
  );

  if (!result) {
    return (
      <View className="flex-1 bg-white px-5 items-center justify-center" style={{ paddingTop: insets.top + 8 }}>
        <Ionicons name="compass-outline" size={34} color="#A3A3A3" />
        <Text className="text-base text-neutral-500 mt-2 text-center">Take the quiz to unlock your matches.</Text>
        <Pressable
          onPress={() => router.push("/quiz")}
          className="mt-4 bg-neutral-900 rounded-2xl px-6 py-3 active:opacity-80"
        >
          <Text className="text-white text-sm font-medium">Take the quiz</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white px-5" style={{ paddingTop: insets.top + 8 }}>
        {Header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#171717" />
          <Text className="text-sm text-neutral-400 mt-3">Finding your matches in {cityLabel(cityId)}…</Text>
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View className="flex-1 bg-white px-5" style={{ paddingTop: insets.top + 8 }}>
        {Header}
        <View className="flex-1 items-center justify-center">
          <Ionicons name="cloud-offline-outline" size={34} color="#A3A3A3" />
          <Text className="text-base text-neutral-500 mt-2 text-center" style={{ maxWidth: 260 }}>
            We couldn't load activities. Check your connection and try again.
          </Text>
          <Pressable
            onPress={() => setReloadKey((k) => k + 1)}
            className="mt-4 bg-neutral-900 rounded-2xl px-6 py-3 active:opacity-80"
          >
            <Text className="text-white text-sm font-medium">Retry</Text>
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

  // Add the current card to the itinerary (= save it) once, reusing the save +
  // celebration path. Shared by the heart/swipe and the quick-add pill.
  function commitSave() {
    if (!ranItem) return;
    const id = ranItem.activity.id;
    const beforeCount = saved.length;
    toggleSave(id);
    celebrateSave(ranItem.match, beforeCount);
    trackActivitySaved({
      activityId: id,
      category: ranItem.activity.category,
      matchPercent: ranItem.match,
      matchTier: matchTier(ranItem.match, ranked.map((r) => r.match)),
      city: cityId
    });
    // itinerary_built once, on the 2 -> 3 transition (a multi-stop plan).
    if (beforeCount === 2) trackItineraryBuilt(beforeCount + 1);
  }

  // Quick-add to itinerary without leaving Discover or advancing the deck. Flat
  // itinerary model (saved list), so "add" === "save"; day is null. Tapping again
  // removes it (toggle). Adds count as a save and fire the celebration.
  function quickAdd() {
    if (!ranItem) return;
    const id = ranItem.activity.id;
    if (saved.includes(id)) {
      toggleSave(id); // remove from itinerary
      return;
    }
    commitSave();
    trackQuickAddItinerary(id, null);
  }

  function advance(save: boolean) {
    if (ranItem) {
      const id = ranItem.activity.id;
      if (save) {
        // Ensure-saved on a right swipe (never un-saves a re-encountered card,
        // so a quick-add followed by a swipe can't accidentally drop it).
        if (!saved.includes(id)) commitSave();
      } else {
        trackActivitySkipped({ activityId: id, matchPercent: ranItem.match });
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
    <View className="flex-1 bg-white px-5" style={{ paddingTop: insets.top + 8 }}>
      {Header}

      <View className="mb-3">
        <DiscoverFilters filters={filters} onChange={applyFilter} />
      </View>

      {filtered.length === 0 && filtersActive ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="filter-outline" size={34} color="#A3A3A3" />
          <Text className="text-base text-neutral-500 mt-2 text-center" style={{ maxWidth: 260 }}>
            No matches with these filters — loosen one.
          </Text>
          <Pressable
            onPress={clearFilters}
            className="mt-4 bg-neutral-900 rounded-2xl px-6 py-3 active:opacity-80"
          >
            <Text className="text-white text-sm font-medium">Clear filters</Text>
          </Pressable>
        </View>
      ) : ranItem ? (
        <>
          <GestureDetector gesture={pan}>
            <Animated.View style={[{ flex: 1 }, cardStyle]}>
              <View className="flex-1 border border-neutral-200 rounded-2xl overflow-hidden">
                <View className="flex-1 bg-neutral-100 items-center justify-center">
                  {/* Icon fallback sits underneath; the photo covers it when it loads. */}
                  <Ionicons
                    name={CATEGORY_ICON[ranItem.activity.category] ?? "sparkles-outline"}
                    size={56}
                    color={accentFor(ranItem.activity)}
                  />
                  {photoUri(ranItem.activity) && (
                    <Image
                      source={{ uri: photoUri(ranItem.activity)! }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      transition={150}
                    />
                  )}
                  <View className="absolute top-3 right-3 bg-white border border-neutral-200 rounded-lg px-2 py-1">
                    <Text className="text-sm font-medium" style={{ color: accentFor(ranItem.activity) }}>
                      {ranItem.match}% match
                    </Text>
                  </View>

                  {/* Directional drag cues — only the relevant one fades in. */}
                  <Animated.View style={[{ position: "absolute", top: 12, left: 12 }, saveCueStyle]}>
                    <Ionicons name="checkmark-circle" size={42} color={SAVE_CUE_COLOR} />
                  </Animated.View>
                  <Animated.View style={[{ position: "absolute", top: 12, left: 12 }, skipCueStyle]}>
                    <Ionicons name="close-circle" size={42} color="#A3A3A3" />
                  </Animated.View>
                </View>
                <View className="px-4 py-4">
                  {isHighMatch(ranItem.match, ranked.map((r) => r.match)) && (
                    <View
                      className="flex-row items-center self-start rounded-full px-2 py-0.5 mb-2"
                      style={{ backgroundColor: getPersonalityProfile(result.dominant).accentSoft }}
                    >
                      <Ionicons name="star" size={11} color={getPersonalityProfile(result.dominant).accent} />
                      <Text
                        className="text-[11px] font-medium ml-1"
                        style={{ color: getPersonalityProfile(result.dominant).accent }}
                      >
                        Top match for you
                      </Text>
                    </View>
                  )}
                  <Text className="text-lg font-medium text-neutral-900">{ranItem.activity.title}</Text>
                  <Text className="text-xs text-neutral-400 mt-1">
                    {ranItem.activity.neighborhood} · {ranItem.activity.category} · {ranItem.activity.priceLevel}
                  </Text>
                  <Text className="text-sm text-neutral-600 mt-3 leading-5">
                    {matchReason(ranItem.activity, result.dominant)}
                  </Text>

                  {/* Quick-add to itinerary — stays on the card; toggles. */}
                  <Pressable
                    onPress={quickAdd}
                    className={`flex-row items-center self-start rounded-full px-3 py-1.5 mt-3 border active:opacity-80 ${
                      saved.includes(ranItem.activity.id) ? "bg-neutral-100 border-neutral-200" : "border-neutral-900"
                    }`}
                  >
                    <Ionicons
                      name={saved.includes(ranItem.activity.id) ? "checkmark" : "add"}
                      size={15}
                      color="#171717"
                    />
                    <Text className="text-xs font-medium text-neutral-900 ml-1">
                      {saved.includes(ranItem.activity.id) ? "In itinerary" : "Add to itinerary"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </GestureDetector>

          <View className="flex-row justify-center items-center py-4" style={{ gap: 34 }}>
            <Pressable
              onPress={() => dismiss(false)}
              className="border border-neutral-200 rounded-full items-center justify-center active:scale-95"
              style={{ width: 62, height: 62 }}
            >
              <Ionicons name="close" size={28} color="#737373" />
            </Pressable>
            <Pressable
              onPress={() => dismiss(true)}
              className="border border-neutral-200 rounded-full items-center justify-center active:scale-95"
              style={{ width: 62, height: 62 }}
            >
              <Animated.View style={heartStyle}>
                <Ionicons
                  name={saved.includes(ranItem.activity.id) ? "heart" : "heart-outline"}
                  size={26}
                  color="#171717"
                />
              </Animated.View>
            </Pressable>
          </View>
        </>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="checkmark-done-outline" size={34} color="#A3A3A3" />
          <Text className="text-base text-neutral-500 mt-2">That's your ATTIA for today.</Text>
          <Pressable onPress={() => setCi(0)} className="mt-4">
            <Text className="text-sm text-neutral-400">Start over</Text>
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
            className="flex-row items-center bg-white border rounded-full px-3 py-1"
            style={{ gap: 3, borderColor: SAVE_CUE_COLOR }}
          >
            <Ionicons name="add" size={14} color={SAVE_CUE_COLOR} />
            <Text className="text-sm font-medium" style={{ color: SAVE_CUE_COLOR }}>
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
          <View className="rounded-2xl px-4 py-2" style={{ backgroundColor: SAVE_CUE_COLOR }}>
            <Text className="text-base font-medium text-white">Perfect match! {flash.pct}%</Text>
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
          <View className="flex-row items-center bg-neutral-900 rounded-full px-4 py-2" style={{ gap: 6 }}>
            <Ionicons name="trophy" size={16} color="#FB923C" />
            <Text className="text-sm font-medium text-white">{toast.msg}</Text>
          </View>
        </Animated.View>
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
