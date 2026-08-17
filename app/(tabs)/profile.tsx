import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ImageBackground,
  Modal,
  TextInput
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useMemo, useState } from "react";
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
import { RESET_PHRASE, isResetConfirmed, resetSummary } from "../../lib/dangerZone";
import { userImageSource } from "../../lib/userImage";
import { type Activity } from "../../types";
import { useAttia } from "../../lib/store";

// Hero geometry (OAT-105). The image is right-anchored; the scrim stays fully
// opaque past the text column's right edge, so the archetype name never sits on
// a lit pixel — measured, see the PR. Widen SCRIM_OPAQUE_TO, never dim the image.
// Hero (OAT-14, vertical composition). The image is NEVER uniformly veiled —
// a uniform veil needed alpha 0.885 to pass, which erased the image. Instead the
// text moves out of the bright band and two VERTICAL scrims darken only the
// edges, leaving the middle of the image completely untouched.
//
// Every value below is measured, not chosen. See the PR for per-archetype
// ratios; re-run the measurement if the source assets ever change.
const HERO_H = 210;
const SCRIM_BOTTOM_ALPHA = 0.76; // worst name contrast 3.67:1 (connoisseur)
const SCRIM_TOP_ALPHA = SCRIM_BOTTOM_ALPHA / 2;
const SCRIM_BOTTOM_START = 0.45; // ramp begins
const SCRIM_BOTTOM_FULL = 0.62; // full strength — must stay BELOW 0.55 of height
const SCRIM_TOP_CLEAR = 0.25; // top scrim gone by here
const HERO_RING = 56; // bottom-right, inside the full-strength band
const HERO_GAP = 12;

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

function LevelRing({
  progress,
  level,
  accent,
  size = RING,
  trackColor = "rgba(0,0,0,0.08)"
}: {
  progress: number;
  level: number;
  accent: string;
  size?: number;
  /** Lifted on the hero, where the track sits over a photograph. */
  trackColor?: string;
}) {
  const scale = size / RING;
  const r = RING_R * scale;
  const stroke = Math.max(4, RING_STROKE * scale);
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress / 100);
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text className="font-display-medium" style={{ fontSize: 19 * scale, color: accent }}>
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
  // Danger-zone modal state. Declared with the other hooks, ABOVE the
  // no-result early return below — putting them after it changed the hook count
  // between renders and crashed Profile with React error #310.
  const [resetOpen, setResetOpen] = useState(false);
  const [resetInput, setResetInput] = useState("");

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

        {/* Hero — vertical composition (OAT-14). The image runs full-bleed and
            is never uniformly veiled; two vertical scrims darken only the top
            and bottom edges, so the middle of the image is left completely
            alone. Content lives inside the scrims, not over the bright band. */}
        <View
          className="border border-line overflow-hidden"
          style={{ borderRadius: 24, height: HERO_H, backgroundColor: color.surface }}
        >
          {heroImage && (
            // ImageBackground, not Image+absoluteFill: react-native-web sizes a
            // bare Image to its natural dimensions and ignores absoluteFill, so
            // the photo stopped short of the card edge (OAT-102 hit the same).
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <ImageBackground
                source={heroImage}
                resizeMode="cover"
                style={{ width: "100%", height: "100%" }}
                // Identity is stated in text inside the card.
                accessible={false}
              />
            </View>
          )}

          {/* Accent wash: above the image, below the scrims, so the card still
              reads as the archetype's colour. */}
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: withAlpha(top.accent, "washStrong") }
            ]}
          />

          {heroImage && (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient id="heroTop" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={color.bg} stopOpacity={SCRIM_TOP_ALPHA} />
                    <Stop offset="1" stopColor={color.bg} stopOpacity={0} />
                  </LinearGradient>
                  <LinearGradient id="heroBottom" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={color.bg} stopOpacity={0} />
                    <Stop
                      offset={
                        (SCRIM_BOTTOM_FULL - SCRIM_BOTTOM_START) / (1 - SCRIM_BOTTOM_START)
                      }
                      stopColor={color.bg}
                      stopOpacity={SCRIM_BOTTOM_ALPHA}
                    />
                    <Stop offset="1" stopColor={color.bg} stopOpacity={SCRIM_BOTTOM_ALPHA} />
                  </LinearGradient>
                </Defs>
                <Rect
                  x="0"
                  y="0"
                  width="100%"
                  height={HERO_H * SCRIM_TOP_CLEAR}
                  fill="url(#heroTop)"
                />
                <Rect
                  x="0"
                  y={HERO_H * SCRIM_BOTTOM_START}
                  width="100%"
                  height={HERO_H * (1 - SCRIM_BOTTOM_START)}
                  fill="url(#heroBottom)"
                />
              </Svg>
            </View>
          )}

          {/* Content sits in the bottom scrim: identity left, level right. */}
          <View style={{ flex: 1, padding: 22, justifyContent: "flex-end" }}>
            <View className="flex-row items-end" style={{ gap: HERO_GAP }}>
              <View className="flex-1">
                <Text
                  className="font-display-semibold text-dim uppercase"
                  style={{ fontSize: 10, letterSpacing: 10 * 0.2 }}
                >
                  Your archetype
                </Text>
                <Text
                  className="font-display-medium mt-1"
                  style={{ fontSize: 28, lineHeight: 28 * 1.05, color: accent }}
                  numberOfLines={2}
                >
                  {top.name}
                </Text>
              </View>
              <LevelRing
                progress={progress}
                level={level}
                accent={accent}
                size={HERO_RING}
                // Lifted from the default: the track sits over a photograph
                // here, where the near-black default measured 1.00:1.
                trackColor="rgba(244,241,236,0.55)"
              />
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

        {/* Actions. "Retake the quiz" is UNCHANGED (OAT-93): it clears the
            result only, and must never reach reset(). The destructive action no
            longer sits beside it — see the danger zone at the foot of the
            screen. */}
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

        <Pressable onPress={() => router.push("/how-it-works")} className="mt-4 active:opacity-60" hitSlop={8}>
          <Text className="font-display text-dim text-center" style={{ fontSize: 13 }}>
            How ATTIA works
          </Text>
        </Pressable>

        {/* DANGER ZONE — deliberately the last thing on the screen, separated by
            a hairline, and nowhere near "Retake the quiz". This action wiped a
            tester's saves once because the two were dressed identically and one
            tap apart. Red label, never a filled red button: filled red on dark
            is loud enough that people press it to find out what it does. */}
        <View className="mt-10" style={{ borderTopWidth: 1, borderTopColor: color.rule }} />
        <Text
          className="font-display-semibold uppercase mt-5"
          style={{ fontSize: 10, letterSpacing: 10 * 0.2, color: color.dim }}
        >
          Danger zone
        </Text>
        <Pressable
          onPress={() => {
            setResetInput("");
            setResetOpen(true);
          }}
          className="mt-3 active:opacity-60"
          hitSlop={8}
        >
          <Text className="font-display" style={{ fontSize: 13.5, color: color.danger }}>
            Reset everything
          </Text>
        </Pressable>
        <Text className="font-display text-dim mt-1.5" style={{ fontSize: 11.5 }}>
          Deletes your saves, badges and quiz result. This cannot be undone.
        </Text>
      </ScrollView>

      {/* Type-to-confirm. A yes/no dialog is answered reflexively; typing RESET
          cannot be. The sentence names what actually dies, with counts read live
          from the store, so consent is given on true terms. */}
      <Modal
        visible={resetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setResetOpen(false)}
      >
        <View
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: "rgba(13,13,15,0.86)", paddingHorizontal: screen.x }}
        >
          <View
            className="w-full bg-surface border border-line rounded-card"
            style={{ padding: 22 }}
          >
            <Text
              className="font-display-medium text-text"
              style={{ fontSize: 20, lineHeight: 20 * 1.25 }}
            >
              Reset everything?
            </Text>
            <Text
              className="font-display text-body mt-3"
              style={{ fontSize: 14, lineHeight: 14 * 1.55 }}
            >
              {resetSummary({
                savedPlaces: saved.length,
                plannedStops: savedCount,
                citiesExplored: citiesExplored.length,
                archetype: result ? top.name.replace(/^The /, "") : null
              })}
            </Text>

            <Text
              className="font-display-semibold text-dim uppercase mt-5"
              style={{ fontSize: 10, letterSpacing: 10 * 0.2 }}
            >
              Type {RESET_PHRASE} to confirm
            </Text>
            <TextInput
              value={resetInput}
              onChangeText={setResetInput}
              // Case-sensitive on purpose: the shift key is part of the friction.
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              accessibilityLabel={`Type ${RESET_PHRASE} to confirm`}
              placeholder={RESET_PHRASE}
              placeholderTextColor={color["faint-2"]}
              className="font-display bg-surface-raised border border-line rounded-option mt-2"
              style={{ padding: 14, fontSize: 15, color: color.text }}
            />

            {/* Cancel is the dominant action. The destructive one stays a plain
                red label, disabled until the word matches exactly. */}
            <Pressable
              onPress={() => setResetOpen(false)}
              className="w-full rounded-list active:opacity-80 mt-5"
              style={{ backgroundColor: color.text, padding: 16 }}
            >
              <Text
                className="font-display-medium text-center"
                style={{ fontSize: 15.5, color: color.bg }}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={!isResetConfirmed(resetInput)}
              onPress={() => {
                setResetOpen(false);
                reset();
                router.replace("/");
              }}
              className="w-full active:opacity-60 mt-3"
              style={{ padding: 12, opacity: isResetConfirmed(resetInput) ? 1 : 0.4 }}
              hitSlop={8}
            >
              <Text
                className="font-display text-center"
                style={{ fontSize: 13.5, color: color.danger }}
              >
                Reset everything
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
