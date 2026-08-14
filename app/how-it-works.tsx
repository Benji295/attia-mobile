import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { color, screen } from "../lib/theme";

// How it works (OAT-38) — restyled to the dark system. Copy is unchanged: this
// slice converts chrome, it does not rewrite content.

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
      className="flex-1 bg-bg"
      style={{
        paddingTop: Math.max(screen.top, insets.top),
        paddingHorizontal: screen.x,
        paddingBottom: Math.max(screen.bottom, insets.bottom)
      }}
    >
      {/* Back — 40x40 circle on surface with a 1px line border, per the spec. */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        className="bg-surface border border-line items-center justify-center active:opacity-80"
        style={{ width: 40, height: 40, borderRadius: 999 }}
      >
        <Ionicons name="chevron-back" size={20} color={color.muted} />
      </Pressable>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        className="mt-6"
      >
        <Text
          className="font-display-medium text-text"
          style={{ fontSize: 34, lineHeight: 34 * 1.12, letterSpacing: 34 * -0.01 }}
        >
          How ATTIA works
        </Text>
        <Text
          className="font-display text-muted mt-3"
          style={{ fontSize: 13.5, lineHeight: 13.5 * 1.6, maxWidth: 320 }}
        >
          ATTIA matches you to trips that actually fit who you are — personality first, not a
          generic top-10 list.
        </Text>

        <View className="mt-7" style={{ gap: 12 }}>
          {STEPS.map((s, i) => (
            <View
              key={s.title}
              className="bg-surface border border-line rounded-card"
              style={{ padding: 20 }}
            >
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Ionicons name={s.icon} size={16} color={color.brand} />
                <Text
                  className="font-display-semibold uppercase"
                  style={{ fontSize: 10, letterSpacing: 10 * 0.22, color: color.brand }}
                >
                  {String(i + 1).padStart(2, "0")}
                </Text>
              </View>
              <Text
                className="font-display-medium text-text mt-3"
                style={{ fontSize: 17, lineHeight: 17 * 1.25 }}
              >
                {s.title}
              </Text>
              <Text
                className="font-display text-muted mt-1.5"
                style={{ fontSize: 13, lineHeight: 13 * 1.6 }}
              >
                {s.body}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Pressable
        onPress={() => router.replace("/quiz")}
        className="w-full rounded-list active:opacity-80"
        style={{ backgroundColor: color.text, padding: 17 }}
      >
        <Text
          className="font-display-medium text-center"
          style={{ fontSize: 15.5, lineHeight: 15.5, color: color.bg }}
        >
          Take the quiz
        </Text>
      </Pressable>
    </View>
  );
}
