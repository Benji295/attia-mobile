import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect } from "react";
import { PERSONALITIES } from "../lib/personalities";
import { useAttia } from "../lib/store";

export default function Results() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { result, reset } = useAttia();

  useEffect(() => {
    if (!result) router.replace("/");
  }, [result]);
  if (!result) return null;

  const top = PERSONALITIES[result.top];
  const total = Object.values(result.tally).reduce((a, b) => a + b, 0);
  const bars = Object.entries(result.tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, n]) => ({ key, pct: Math.round((n / total) * 100) }));

  return (
    <View className="flex-1 bg-white px-6 justify-center" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
      <Text className="text-sm text-neutral-400 text-center">You are a</Text>
      <Text className="text-3xl font-medium text-center mt-1 mb-3" style={{ color: top.accent }}>
        {top.name}
      </Text>
      <Text className="text-sm text-neutral-500 text-center leading-6 mb-8" style={{ maxWidth: 270, alignSelf: "center" }}>
        {top.blurb}
      </Text>

      {bars.map((b) => (
        <View key={b.key} className="flex-row items-center mb-3" style={{ gap: 10 }}>
          <Text className="text-sm text-neutral-500" style={{ width: 120 }}>
            {PERSONALITIES[b.key].name}
          </Text>
          <View className="flex-1 bg-neutral-100 rounded-full overflow-hidden" style={{ height: 8 }}>
            <View style={{ height: "100%", width: `${b.pct}%`, backgroundColor: PERSONALITIES[b.key].accent }} />
          </View>
          <Text className="text-xs text-neutral-400" style={{ width: 34 }}>
            {b.pct}%
          </Text>
        </View>
      ))}

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
    </View>
  );
}
