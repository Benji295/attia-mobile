import { View, Text, Pressable, Dimensions, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { rankActivities, getPersonalityProfile } from "../../lib/scoring/recommendations";
import { getActivities } from "../../lib/places/fetchActivities";
import { photoUri, accentFor } from "../../lib/activities/display";
import { type Activity } from "../../types";
import { useAttia } from "../../lib/store";

const CITY_ID = "washington-dc";
const SCREEN_W = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_W * 0.3; // distance past which a release commits
const OFF_SCREEN = SCREEN_W * 1.5; // where a committed card flies to
const SAVE_CUE_COLOR = getPersonalityProfile("explorer").accent; // Explorer green, from the locked palette

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
  const { result, saved, toggleSave, cacheActivities } = useAttia();
  const [ci, setCi] = useState(0);
  const translateX = useSharedValue(0);

  // Live data state.
  const [data, setData] = useState<Activity[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Fetch live activities on mount (and on retry). Cache them in the store so
  // Saved/Itinerary resolve saved ids from the same set.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    getActivities(CITY_ID)
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
  }, [reloadKey, cacheActivities]);

  const ranked = useMemo(
    () => (result && data ? rankActivities(data, CITY_ID, result.scores, result) : []),
    [result, data]
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

  // Header reused across content states.
  const Header = (
    <>
      <View className="flex-row items-baseline justify-between">
        <Text className="text-2xl font-medium text-neutral-900">Discover</Text>
        {saved.length > 0 && <Text className="text-xs text-neutral-400">{saved.length} saved</Text>}
      </View>
      <View className="flex-row items-center mt-1 mb-4" style={{ gap: 4 }}>
        <Ionicons name="location-outline" size={14} color="#737373" />
        <Text className="text-sm text-neutral-500">Washington DC</Text>
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
          <Text className="text-sm text-neutral-400 mt-3">Finding your matches in Washington DC…</Text>
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

  const ranItem = ranked[ci];

  function advance(save: boolean) {
    if (save && ranItem) toggleSave(ranItem.activity.id);
    setCi((c) => c + 1);
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

      {ranItem ? (
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
                  <Text className="text-lg font-medium text-neutral-900">{ranItem.activity.title}</Text>
                  <Text className="text-xs text-neutral-400 mt-1">
                    {ranItem.activity.neighborhood} · {ranItem.activity.category} · {ranItem.activity.priceLevel}
                  </Text>
                  <Text className="text-sm text-neutral-600 mt-3 leading-5">{ranItem.explanation}</Text>
                  {ranItem.traitLabels.length > 0 && (
                    <Text className="text-xs text-neutral-400 mt-2">{ranItem.traitLabels.join(" · ")}</Text>
                  )}
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
              <Ionicons
                name={saved.includes(ranItem.activity.id) ? "heart" : "heart-outline"}
                size={26}
                color="#171717"
              />
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
    </View>
  );
}
