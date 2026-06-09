import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const BRAND = "#FB923C";

const STEPS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: "help-circle-outline",
    title: "Take a quick quiz",
    body: "A handful of one-tap questions about how you like to travel — no wrong answers."
  },
  {
    icon: "sparkles-outline",
    title: "Meet your archetype",
    body: "We sort you into one of eight travel personalities, with your top matches shown."
  },
  {
    icon: "compass-outline",
    title: "Discover your ATTIA",
    body: "Swipe through real activities in your city, ranked by how well they fit you."
  }
];

export default function HowItWorks() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-white px-6"
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}
    >
      <Pressable onPress={() => router.back()} hitSlop={10} className="mb-6">
        <Ionicons name="chevron-back" size={24} color="#737373" />
      </Pressable>

      <Text className="text-3xl font-medium text-neutral-900">How ATTIA works</Text>
      <Text className="text-sm text-neutral-500 mt-2 leading-6" style={{ maxWidth: 320 }}>
        ATTIA matches you to trips that actually fit who you are — personality first, not a generic top-10 list.
      </Text>

      <View className="mt-8" style={{ gap: 20 }}>
        {STEPS.map((s, i) => (
          <View key={s.title} className="flex-row" style={{ gap: 14 }}>
            <View
              className="rounded-full items-center justify-center"
              style={{ width: 44, height: 44, backgroundColor: "#FFF1E6" }}
            >
              <Ionicons name={s.icon} size={22} color={BRAND} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-medium text-neutral-900">
                {i + 1}. {s.title}
              </Text>
              <Text className="text-sm text-neutral-500 mt-1 leading-5">{s.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View className="flex-1" />

      <Pressable
        onPress={() => router.replace("/quiz")}
        className="w-full bg-neutral-900 rounded-2xl py-4 active:opacity-80"
      >
        <Text className="text-white text-center text-base font-medium">Take the quiz</Text>
      </Pressable>
    </View>
  );
}
