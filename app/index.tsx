import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useAttia } from "../lib/store";

const BRAND = "#FB923C"; // sunset warmth, from the locked palette

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hydrated, result } = useAttia();

  // The launch decision runs EXACTLY ONCE, the first time hydration completes:
  // a returning user (persisted result) jumps straight to Home. We must NOT
  // react to `result` changing later — index stays mounted beneath the stack,
  // so redirecting when the quiz sets `result` would yank the user off the
  // reveal screen mid-confetti (the OAT-13 regression this fixes).
  const [decided, setDecided] = useState(false);
  const decidedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || decidedRef.current) return;
    decidedRef.current = true;
    setDecided(true);
    if (result) router.replace("/home");
    // result intentionally read once here; not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, router]);

  // Blank surface only while the launch decision is pending: until hydrated, or
  // (returning user) during the one-shot redirect to Home. After the decision,
  // index always renders the welcome screen — never a stuck blank.
  if (!hydrated || (!decided && result)) {
    return <View className="flex-1 bg-white" />;
  }

  return (
    <View
      className="flex-1 bg-white items-center justify-center px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}
    >
      {/* Fast visual hook — a warm brand spark over the wordmark. */}
      <Animated.View entering={FadeInDown.duration(450)}>
        <Ionicons name="sparkles" size={40} color={BRAND} />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(450).delay(90)}>
        <Text className="text-6xl font-medium text-neutral-900 mt-4" style={{ letterSpacing: 1 }}>
          ATTIA
        </Text>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(500).delay(240)}>
        <Text className="text-lg text-neutral-500 mt-2">Your ATTIA awaits.</Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(360)} style={{ width: "100%", alignItems: "center" }}>
        <Pressable
          onPress={() => router.push("/quiz")}
          className="mt-10 w-full bg-neutral-900 rounded-2xl py-4 active:opacity-80"
        >
          <Text className="text-white text-center text-base font-medium">Take the quiz</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/how-it-works")} className="mt-4 active:opacity-60" hitSlop={8}>
          <Text className="text-sm text-neutral-400">How it works</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
