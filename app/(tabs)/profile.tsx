import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
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
import { type Activity } from "../../types";
import { useAttia } from "../../lib/store";

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
  const { result, saved, streak, activityCache, citiesExplored, reset } = useAttia();

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

        {/* Hero — accent-tinted, level ring + archetype + streak chip. */}
        <View
          className="border border-line"
          style={{
            borderRadius: 24,
            padding: 22,
            backgroundColor: withAlpha(top.accent, "washStrong")
          }}
        >
          <View className="flex-row items-center">
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
              <View
                className="flex-row items-center self-start bg-bg rounded-pill mt-3"
                style={{ gap: 5, paddingHorizontal: 12, paddingVertical: 6 }}
              >
                <Ionicons name="flame" size={14} color={accent} />
                <Text className="font-display-medium" style={{ fontSize: 12, color: accent }}>
                  {streak} day{streak === 1 ? "" : "s"} streak
                </Text>
              </View>
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

        {/* Actions */}
        <Pressable
          onPress={() => {
            reset();
            router.replace("/");
          }}
          className="mt-7 border border-line rounded-list active:opacity-80"
          style={{ padding: 15 }}
        >
          <Text className="font-display text-muted text-center" style={{ fontSize: 13.5 }}>
            Retake the quiz
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
