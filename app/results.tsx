import { View, Text, Pressable, Dimensions, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect } from "react";
import Animated, { ZoomIn } from "react-native-reanimated";
import ConfettiCannon from "react-native-confetti-cannon";
import { color, screen } from "../lib/theme";
import { getPersonalityProfile } from "../lib/scoring/recommendations";
import { personalityIds } from "../types";
import { hapticSuccess, prefersReducedMotion } from "../lib/feedback";
import { trackArchetypeRevealed } from "../lib/analytics";
import { useAttia } from "../lib/store";

const SCREEN_W = Dimensions.get("window").width;

export default function Results() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { result, reset } = useAttia();

  useEffect(() => {
    if (!result) router.replace("/");
  }, [result]);

  // Tier 3: success haptic + archetype_revealed as the archetype lands (once).
  useEffect(() => {
    if (result) {
      hapticSuccess();
      trackArchetypeRevealed(result.dominant);
    }
    // fire once on mount of a valid reveal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!result) return null;

  const top = getPersonalityProfile(result.dominant);
  // Confetti from the locked palette: the archetype's accent + its secondaries
  // + brand warmth — never a random rainbow.
  const confettiColors = [
    top.accent,
    ...result.secondary.map((id) => getPersonalityProfile(id).accent),
    color.brand
  ];
  const maxScore = result.scores[result.dominant] || 1;
  const bars = [...personalityIds]
    .sort((a, b) => result.scores[b] - result.scores[a])
    .slice(0, 3)
    .filter((id) => result.scores[id] > 0)
    .map((id) => ({ id, pct: Math.round((result.scores[id] / maxScore) * 100) }));

  return (
    <View
      className="flex-1 bg-bg justify-center"
      style={{
        paddingTop: Math.max(screen.top, insets.top),
        paddingHorizontal: screen.x,
        paddingBottom: Math.max(screen.bottom, insets.bottom)
      }}
    >
      <Text
        className="font-display-semibold text-dim text-center uppercase"
        style={{ fontSize: 10, letterSpacing: 10 * 0.24 }}
      >
        You are
      </Text>
      <Animated.View entering={ZoomIn.duration(520).delay(120)}>
        <Text
          className="font-display-medium text-center mt-2 mb-3"
          style={{ fontSize: 42, lineHeight: 42 * 1.05, letterSpacing: 42 * -0.02, color: top.accent }}
        >
          {top.name}
        </Text>
      </Animated.View>
      <Text
        className="font-display text-body text-center mb-8"
        style={{ fontSize: 16, lineHeight: 16 * 1.6, maxWidth: 290, alignSelf: "center" }}
      >
        {top.description}
      </Text>

      {bars.map((b) => {
        const profile = getPersonalityProfile(b.id);
        return (
          <View key={b.id} className="flex-row items-center mb-3" style={{ gap: 10 }}>
            <Text
              className="font-display text-muted"
              style={{ fontSize: 13, width: 130 }}
              numberOfLines={1}
            >
              {profile.name.replace("The ", "")}
            </Text>
            <View className="flex-1 bg-rule rounded-pill overflow-hidden" style={{ height: 5 }}>
              <View style={{ height: "100%", width: `${b.pct}%`, backgroundColor: profile.accent }} />
            </View>
            <Text
              className="font-display text-meta"
              style={{ fontSize: 11, width: 34, textAlign: "right" }}
            >
              {b.pct}%
            </Text>
          </View>
        );
      })}

      <Pressable
        onPress={() => router.replace("/home")}
        className="mt-8 w-full rounded-list active:opacity-80"
        style={{ backgroundColor: color.text, padding: 17 }}
      >
        <Text
          className="font-display-medium text-center"
          style={{ fontSize: 15.5, lineHeight: 15.5, color: color.bg }}
        >
          Discover your ATTIA
        </Text>
      </Pressable>

      <Pressable
        onPress={() => {
          reset();
          router.replace("/");
        }}
        className="mt-3 border border-line rounded-list active:opacity-80"
        style={{ padding: 13 }}
      >
        <Text className="font-display text-muted text-center" style={{ fontSize: 13.5 }}>
          Retake the quiz
        </Text>
      </Pressable>

      {/* One-shot celebratory burst on reveal. pointerEvents="none" so it never
          blocks the reveal content or the CTA; fadeOut lets it settle. Skipped
          under Reduce Motion (the haptic + name animation still play). */}
      {!prefersReducedMotion() && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiCannon
            count={80}
            origin={{ x: SCREEN_W / 2, y: -20 }}
            colors={confettiColors}
            fadeOut
            autoStart
            explosionSpeed={350}
            fallSpeed={2600}
          />
        </View>
      )}
    </View>
  );
}
