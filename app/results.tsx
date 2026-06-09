import { View, Text, Pressable, Dimensions, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect } from "react";
import ConfettiCannon from "react-native-confetti-cannon";
import { getPersonalityProfile } from "../lib/scoring/recommendations";
import { personalityIds } from "../types";
import { useAttia } from "../lib/store";

const SCREEN_W = Dimensions.get("window").width;
const BRAND = "#FB923C"; // sunset warmth, from the locked palette

export default function Results() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { result, reset } = useAttia();

  useEffect(() => {
    if (!result) router.replace("/");
  }, [result]);
  if (!result) return null;

  const top = getPersonalityProfile(result.dominant);
  // Confetti from the locked palette: the archetype's accent + its secondaries
  // + brand warmth — never a random rainbow.
  const confettiColors = [
    top.accent,
    ...result.secondary.map((id) => getPersonalityProfile(id).accent),
    BRAND
  ];
  const maxScore = result.scores[result.dominant] || 1;
  const bars = [...personalityIds]
    .sort((a, b) => result.scores[b] - result.scores[a])
    .slice(0, 3)
    .filter((id) => result.scores[id] > 0)
    .map((id) => ({ id, pct: Math.round((result.scores[id] / maxScore) * 100) }));

  return (
    <View
      className="flex-1 bg-white px-6 justify-center"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}
    >
      <Text className="text-sm text-neutral-400 text-center">You are</Text>
      <Text className="text-3xl font-medium text-center mt-1 mb-3" style={{ color: top.accent }}>
        {top.name}
      </Text>
      <Text
        className="text-sm text-neutral-500 text-center leading-6 mb-8"
        style={{ maxWidth: 290, alignSelf: "center" }}
      >
        {top.description}
      </Text>

      {bars.map((b) => {
        const profile = getPersonalityProfile(b.id);
        return (
          <View key={b.id} className="flex-row items-center mb-3" style={{ gap: 10 }}>
            <Text className="text-sm text-neutral-500" style={{ width: 130 }} numberOfLines={1}>
              {profile.name.replace("The ", "")}
            </Text>
            <View className="flex-1 bg-neutral-100 rounded-full overflow-hidden" style={{ height: 8 }}>
              <View style={{ height: "100%", width: `${b.pct}%`, backgroundColor: profile.accent }} />
            </View>
            <Text className="text-xs text-neutral-400" style={{ width: 34, textAlign: "right" }}>
              {b.pct}%
            </Text>
          </View>
        );
      })}

      <Pressable
        onPress={() => router.replace("/discover")}
        className="mt-8 w-full bg-neutral-900 rounded-2xl py-4 active:opacity-80"
      >
        <Text className="text-white text-center text-base font-medium">Discover your ATTIA</Text>
      </Pressable>

      <Pressable
        onPress={() => {
          reset();
          router.replace("/");
        }}
        className="mt-3"
      >
        <Text className="text-sm text-neutral-400 text-center">Retake the quiz</Text>
      </Pressable>

      {/* One-shot celebratory burst on reveal. pointerEvents="none" so it never
          blocks the reveal content or the CTA; fadeOut lets it settle. */}
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
    </View>
  );
}
