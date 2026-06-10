import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useAttia } from "../lib/store";

const BRAND = "#FB923C"; // sunset warmth, from the locked palette

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hydrated, result } = useAttia();

  // Returning users (persisted quiz result) skip straight to the Home tab.
  // Wait for hydration before deciding so we never flash the welcome screen.
  useEffect(() => {
    if (hydrated && result) router.replace("/home");
  }, [hydrated, result, router]);

  // Hold a blank surface until we know whether to redirect (avoids a welcome
  // flash for returning users, and a wrong-screen flash for new users).
  if (!hydrated || result) {
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
