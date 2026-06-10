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
  STREAK_BADGE_DAYS
} from "../../lib/gamification";
import { activities as seedActivities } from "../../data/activities";
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
        <Circle cx={RING / 2} cy={RING / 2} r={RING_R} stroke="rgba(0,0,0,0.08)" strokeWidth={RING_STROKE} fill="none" />
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
      <Text className="text-xl font-medium" style={{ color: accent }}>
        Lv {level}
      </Text>
    </View>
  );
}

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { result, saved, streak, activityCache, reset } = useAttia();

  // Resolve saved ids -> activities from the live cache (seed fallback) for the
  // "Perfect match" badge.
  const savedActivities = useMemo(() => {
    const byId: Record<string, Activity> = {};
    for (const a of seedActivities) byId[a.id] = a;
    Object.assign(byId, activityCache);
    return saved.map((id) => byId[id]).filter(Boolean) as Activity[];
  }, [saved, activityCache]);

  // No quiz result yet → keep it honest and simple (archetype is required to theme).
  if (!result) {
    return (
      <View className="flex-1 bg-white px-5 items-center justify-center" style={{ paddingTop: insets.top + 8 }}>
        <Ionicons name="person-circle-outline" size={40} color="#A3A3A3" />
        <Text className="text-base text-neutral-500 mt-2 text-center">Take the quiz to unlock your profile.</Text>
        <Pressable
          onPress={() => router.push("/quiz")}
          className="mt-4 bg-neutral-900 rounded-2xl px-6 py-3 active:opacity-80"
        >
          <Text className="text-white text-sm font-medium">Take the quiz</Text>
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
    { icon: "location" as const, label: "Cities explored", value: 1, color: getPersonalityProfile("connector").accent },
    { icon: "flame" as const, label: "Day streak", value: streak, color: getPersonalityProfile("adrenaline-junkie").accent }
  ];

  const badges: Badge[] = [
    { key: "first-match", label: "First match", icon: "sparkles", unlocked: true, unlock: "Take the quiz" },
    { key: "collector", label: "Collector", icon: "bookmark", unlocked: savedCount >= 3, unlock: "Save 3 activities" },
    { key: "day-maker", label: "Day maker", icon: "sunny", unlocked: fullDay, unlock: `Plan a full day (${FULL_DAY_MIN_STOPS}+ stops)` },
    { key: "perfect-match", label: "Perfect match", icon: "star", unlocked: hasPerfect, unlock: `Save a ${PERFECT_MATCH_MIN}%+ match` },
    { key: "city-hopper", label: "City hopper", icon: "airplane", unlocked: false, unlock: "Explore a 2nd city" },
    { key: "streak-7", label: `${STREAK_BADGE_DAYS}-day streak`, icon: "flame", unlocked: streak >= STREAK_BADGE_DAYS, unlock: `Reach a ${STREAK_BADGE_DAYS}-day streak` }
  ];

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 8 }}>
      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-medium text-neutral-900 mb-5">Profile</Text>

        {/* Hero — accent-tinted, level ring + archetype + streak chip. */}
        <View className="rounded-3xl p-5" style={{ backgroundColor: top.accentSoft }}>
          <View className="flex-row items-center">
            <LevelRing progress={progress} level={level} accent={accent} />
            <View className="flex-1 ml-5">
              <Text className="text-xs uppercase text-neutral-500" style={{ letterSpacing: 1 }}>
                Your archetype
              </Text>
              <Text className="text-2xl font-medium mt-0.5" style={{ color: accent }}>
                {top.name}
              </Text>
              <View className="flex-row items-center self-start bg-white rounded-full px-3 py-1 mt-2" style={{ gap: 5 }}>
                <Ionicons name="flame" size={14} color={accent} />
                <Text className="text-xs font-medium" style={{ color: accent }}>
                  {streak} day{streak === 1 ? "" : "s"} streak
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* XP bar */}
        <View className="mt-4">
          <View className="flex-row justify-between mb-1.5">
            <Text className="text-xs text-neutral-500">{progress}/100 XP</Text>
            <Text className="text-xs text-neutral-400">
              {toNext} to Level {level + 1}
            </Text>
          </View>
          <View className="bg-neutral-100 rounded-full overflow-hidden" style={{ height: 8 }}>
            <View style={{ height: "100%", width: `${progress}%`, backgroundColor: accent }} />
          </View>
        </View>

        {/* 2x2 progress grid */}
        <View className="flex-row flex-wrap mt-6" style={{ gap: 12 }}>
          {tiles.map((t) => (
            <View
              key={t.label}
              className="border border-neutral-200 rounded-2xl px-4 py-4"
              style={{ width: "47.5%" }}
            >
              <Ionicons name={t.icon} size={20} color={t.color} />
              <Text className="text-2xl font-medium text-neutral-900 mt-2">{t.value}</Text>
              <Text className="text-xs text-neutral-400 mt-0.5">{t.label}</Text>
            </View>
          ))}
        </View>

        {/* Achievements */}
        <Text className="text-base font-medium text-neutral-900 mt-7 mb-3">Achievements</Text>
        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          {badges.map((b) => (
            <View
              key={b.key}
              className="rounded-2xl px-4 py-4"
              style={{
                width: "47.5%",
                backgroundColor: b.unlocked ? top.accentSoft : "#F5F5F5",
                borderWidth: 1,
                borderColor: b.unlocked ? "transparent" : "#EEEEEE"
              }}
            >
              <View className="flex-row items-center justify-between">
                <Ionicons name={b.icon} size={22} color={b.unlocked ? accent : "#C4C4C4"} />
                {!b.unlocked && <Ionicons name="lock-closed" size={14} color="#C4C4C4" />}
              </View>
              <Text
                className="text-sm font-medium mt-2"
                style={{ color: b.unlocked ? accent : "#9CA3AF" }}
              >
                {b.label}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: b.unlocked ? "#737373" : "#B5B5B5" }}>
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
          className="mt-7 border border-neutral-200 rounded-2xl py-3 active:bg-neutral-50"
        >
          <Text className="text-sm text-neutral-700 text-center">Retake the quiz</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/how-it-works")} className="mt-4 active:opacity-60" hitSlop={8}>
          <Text className="text-sm text-neutral-400 text-center">How ATTIA works</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
