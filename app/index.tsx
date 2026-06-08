import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-white items-center justify-center px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}
    >
      <Text className="text-5xl font-medium text-neutral-900" style={{ letterSpacing: 1 }}>
        ATTIA
      </Text>
      <Text className="text-lg text-neutral-500 mt-1">Your ATTIA awaits.</Text>

      <Text className="text-sm text-neutral-400 text-center mt-6 leading-6" style={{ maxWidth: 260 }}>
        A few quick questions, and we match you to trips that actually fit who you are.
      </Text>

      <Pressable
        onPress={() => router.push("/quiz")}
        className="mt-8 w-full bg-neutral-900 rounded-2xl py-4 active:opacity-80"
      >
        <Text className="text-white text-center text-base font-medium">Take the quiz</Text>
      </Pressable>

      <Text className="text-xs text-neutral-400 mt-4">30 seconds · 4 quick taps</Text>
    </View>
  );
}
