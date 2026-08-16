import { View, Text, Pressable, ScrollView, StyleSheet, Alert, Image } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useMemo } from "react";
import { getPersonalityProfile, activityMatchPercentage } from "../../lib/scoring/recommendations";
import {
  computeXp,
  levelInfo,
  isFullDay,
  FULL_DAY_MIN_STOPS,
  PERFECT_MATCH_MIN,
  STREAK_BADGE_DAYS,
  CITY_HOPPER_MIN_CITIES
} from "../../lib/gamification";
import { activities as seedActivities } from "../../data/activities";
import { color, screen, withAlpha } from "../../lib/theme";
import { userImageSource } from "../../lib/userImage";
import { type Activity } from "../../types";
import { useAttia } from "../../lib/store";

// Hero geometry (OAT-105). The image is right-anchored; the scrim stays fully
// opaque past the text column's right edge, so the archetype name never sits on
// a lit pixel — measured, see the PR. Widen SCRIM_OPAQUE_TO, never dim the image.
const HERO_IMAGE_WIDTH = "45%";
const HERO_TEXT_RESERVE = "40%"; // text column ends at 60% of the card
const SCRIM_OPAQUE_TO = 0.62; // opaque past 60%, then fades to the right edge

const RING = 96;
const RING_R = 42;
const RING_STROKE = 7;
const RING_C = 2 * Math.PI * RING_R;

type Badge = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  unlocked: boolean;
  unlock: string;
};

function LevelRing({ progress, level, accent }: { progress: number; level: number; accent: string }) {
  const offset = RING_C * (1 - progress / 100);
  return (
    <View style={{ width: RING, height: RING }} className="items-center justify-center">
      <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
        <Circle cx={RING / 2} cy={RING / 2} r={RING_R} stroke={color.rule} strokeWidth={RING_STROKE} fill="none" />
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={RING_R}
          stroke={accent}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeDasharray={RING_C}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      </Svg>
      <Text className="font-display-medium" style={{ fontSize: 19, color: accent }}>
        Lv {level}
      </Text>
    </View>
  );
}

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { result, saved, streak, activityCache, citiesExplored, clearResult, reset } = useAttia();

  // Resolve saved ids -> activities from the live cache (seed fallback) for the
  // "Perfect match" badge. Deliberately GLOBAL (every city): XP, level, streak
  // and badges are a cumulative per-user score, never scoped to a trip.
  const savedActivities = useMemo(() => {
    const byId: Record<string, Activity> = {};
    for (const a of seedActivities) byId[a.id] = a;
    Object.assign(byId, activityCache);
    return saved.map((e) => byId[e.id]).filter(Boolean) as Activity[];
  }, [saved, activityCache]);

  // No quiz result yet → keep it honest and simple (archetype is required to theme).
  if (!result) {
    return (
      <View
        className="flex-1 bg-bg items-center justify-center"
        style={{ paddingTop: Math.max(screen.top, insets.top), paddingHorizontal: screen.x }}
      >
        <Ionicons name="person-circle-outline" size={40} color={color.dim} />
        <Text className="font-display text-muted mt-3 text-center" style={{ fontSize: 14 }}>
          Take the quiz to unlock your profile.
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

  const top = getPersonalityProfile(result.dominant);
  const accent = top.accent;
  const heroImage = userImageSource(result);
  const savedCount = saved.length;
  const fullDay = isFullDay(savedCount);
  const xp = computeXp(true, savedCount);
  const { level, progress, toNext } = levelInfo(xp);
  const hasPerfect = savedActivities.some((a) => activityMatchPercentage(a, result.scores) >= PERFECT_MATCH_MIN);

  // 2x2 progress tiles (icons in palette accents).
  const tiles = [
    { icon: "heart" as const, label: "Saved", value: savedCount, color: getPersonalityProfile("socialite").accent },
    { icon: "map" as const, label: "Stops planned", value: savedCount, color: getPersonalityProfile("explorer").accent },
    {
      icon: "location" as const,
      label: "Cities explored",
      // Distinct cities across ALL saves (was hardcoded to 1).
      value: citiesExplored.length,
      color: getPersonalityProfile("connector").accent
    },
    { icon: "flame" as const, label: "Day streak", value: streak, color: getPersonalityProfile("adrenaline-junkie").accent }
  ];

  const badges: Badge[] = [
    { key: "first-match", label: "First match", icon: "sparkles", unlocked: true, unlock: "Take the quiz" },
    { key: "collector", label: "Collector", icon: "bookmark", unlocked: savedCount >= 3, unlock: "Save 3 activities" },
    { key: "day-maker", label: "Day maker", icon: "sunny", unlocked: fullDay, unlock: `Plan a full day (${FULL_DAY_MIN_STOPS}+ stops)` },
    { key: "perfect-match", label: "Perfect match", icon: "star", unlocked: hasPerfect, unlock: `Save a ${PERFECT_MATCH_MIN}%+ match` },
    {
      key: "city-hopper",
      label: "City hopper",
      icon: "airplane",
      unlocked: citiesExplored.length >= CITY_HOPPER_MIN_CITIES,
      unlock: "Explore a 2nd city"
    },
    { key: "streak-7", label: `${STREAK_BADGE_DAYS}-day streak`, icon: "flame", unlocked: streak >= STREAK_BADGE_DAYS, unlock: `Reach a ${STREAK_BADGE_DAYS}-day streak` }
  ];

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: Math.max(screen.top, insets.top) }}>
      <ScrollView
        style={{ paddingHorizontal: screen.x }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="font-display-medium text-text mb-5"
          style={{ fontSize: 30, lineHeight: 30 * 1.15, letterSpacing: 30 * -0.015 }}
        >
          Profile
        </Text>

        {/* Hero — the archetype made visible: level ring, identity, and the
            archetype's own image anchored right behind a scrim. The streak pill
            is gone; the stat grid below already carries Day streak, and the hero
            should carry identity, not gamification. */}
        <View
          className="border border-line overflow-hidden"
          style={{ borderRadius: 24, backgroundColor: withAlpha(top.accent, "washStrong") }}
        >
          {heroImage && (
            <>
              <View
                pointerEvents="none"
                style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: HERO_IMAGE_WIDTH }}
              >
                <Image
                  source={heroImage}
                  resizeMode="cover"
                  style={StyleSheet.absoluteFill}
                  // Identity is already stated in text beside it.
                  accessible={false}
                />
              </View>
              {/* Left-to-right scrim: solid surface across the text column, then
                  a fade that lets the image through. react-native-svg, because
                  expo-linear-gradient is not a dependency of this project. */}
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <Svg width="100%" height="100%">
                  <Defs>
                    <LinearGradient id="heroScrim" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor={color.surface} stopOpacity={1} />
                      <Stop offset={SCRIM_OPAQUE_TO} stopColor={color.surface} stopOpacity={1} />
                      <Stop offset="1" stopColor={color.surface} stopOpacity={0} />
                    </LinearGradient>
                  </Defs>
                  <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroScrim)" />
                </Svg>
              </View>
            </>
          )}

          <View
            className="flex-row items-center"
            style={{ padding: 22, paddingRight: heroImage ? HERO_TEXT_RESERVE : 22 }}
          >
            <LevelRing progress={progress} level={level} accent={accent} />
            <View className="flex-1 ml-5">
              <Text
                className="font-display-semibold text-dim uppercase"
                style={{ fontSize: 10, letterSpacing: 10 * 0.2 }}
              >
                Your archetype
              </Text>
              <Text className="font-display-medium mt-1" style={{ fontSize: 28, color: accent }}>
                {top.name}
              </Text>
            </View>
          </View>
        </View>

        {/* XP bar */}
        <View className="mt-4">
          <View className="flex-row justify-between mb-1.5">
            <Text className="font-display text-muted" style={{ fontSize: 12 }}>
              {progress}/100 XP
            </Text>
            <Text className="font-display text-meta" style={{ fontSize: 12 }}>
              {toNext} to Level {level + 1}
            </Text>
          </View>
          <View className="bg-rule rounded-pill overflow-hidden" style={{ height: 6 }}>
            <View style={{ height: "100%", width: `${progress}%`, backgroundColor: accent }} />
          </View>
        </View>

        {/* 2x2 progress grid */}
        <View className="flex-row flex-wrap mt-6" style={{ gap: 12 }}>
          {tiles.map((t) => (
            <View
              key={t.label}
              className="bg-surface border border-line rounded-secondary"
              style={{ width: "47.5%", padding: 17 }}
            >
              <Ionicons name={t.icon} size={20} color={t.color} />
              <Text className="font-display-medium text-text mt-2" style={{ fontSize: 24 }}>
                {t.value}
              </Text>
              <Text className="font-display text-muted mt-1" style={{ fontSize: 11.5 }}>
                {t.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Achievements */}
        <Text
          className="font-display-semibold text-dim uppercase mt-7 mb-3"
          style={{ fontSize: 10, letterSpacing: 10 * 0.2 }}
        >
          Achievements
        </Text>
        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          {badges.map((b) => (
            <View
              key={b.key}
className="rounded-secondary"
              style={{
                width: "47.5%",
                padding: 17,
                backgroundColor: b.unlocked ? color.surface : "transparent",
                borderWidth: 1,
                borderColor: b.unlocked ? color["line-strong"] : color.line
              }}
            >
              <View className="flex-row items-center justify-between">
                <Ionicons name={b.icon} size={22} color={b.unlocked ? accent : color["faint-2"]} />
                {!b.unlocked && <Ionicons name="lock-closed" size={14} color={color["faint-3"]} />}
              </View>
              <Text
className="font-display-medium mt-2"
                style={{ fontSize: 13.5, color: b.unlocked ? color.text : color["faint-2"] }}
              >
                {b.label}
              </Text>
              <Text
                className="font-display mt-1"
                style={{ fontSize: 11.5, color: b.unlocked ? color.brand : color.dim }}
              >
                {b.unlocked ? "Unlocked" : b.unlock}
              </Text>
            </View>
          ))}
        </View>

        {/* Actions.
            These were ONE button until OAT-93: "Retake the quiz" called reset(),
            which silently deleted every save, badge and explored city. Retaking
            a quiz is not a request to delete your trip, so the two are now
            separate — and the destructive one says what it destroys. */}
        <Pressable
          onPress={() => {
            clearResult(); // result only — saves, badges, streak, cities survive
            router.replace("/quiz");
          }}
          className="mt-7 border border-line rounded-list active:opacity-80"
          style={{ padding: 15 }}
        >
          <Text className="font-display text-muted text-center" style={{ fontSize: 13.5 }}>
            Retake the quiz
          </Text>
        </Pressable>

        {/* Visually secondary, and gated behind a confirmation that names the
            losses rather than asking a vague "are you sure?". */}
        <Pressable
          onPress={() =>
            Alert.alert(
              "Reset everything?",
              "This deletes your saved places, your badges, the cities you have explored, and your quiz result. It cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Reset everything",
                  style: "destructive",
                  onPress: () => {
                    reset();
                    router.replace("/");
                  }
                }
              ]
            )
          }
          className="mt-3 active:opacity-60"
          hitSlop={8}
        >
          <Text className="font-display text-dim text-center" style={{ fontSize: 12.5 }}>
            Reset everything
          </Text>
        </Pressable>

        <Pressable onPress={() => router.push("/how-it-works")} className="mt-4 active:opacity-60" hitSlop={8}>
          <Text className="font-display text-dim text-center" style={{ fontSize: 13 }}>
            How ATTIA works
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
