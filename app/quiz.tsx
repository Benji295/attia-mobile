import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import Animated, { FadeInLeft, FadeInRight } from "react-native-reanimated";
import { color, screen } from "../lib/theme";
import { quizQuestions } from "../data/quiz";
import { trackQuizStarted, trackQuizCompleted } from "../lib/analytics";
import { useAttia } from "../lib/store";

export default function Quiz() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { finishQuiz } = useAttia();
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // Drives the between-question transition direction (forward vs back).
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const question = quizQuestions[qi];
  const progress = (qi + 1) / quizQuestions.length;

  // quiz_started — user begins the quiz (entry screen mount).
  useEffect(() => {
    trackQuizStarted();
  }, []);

  function pick(optionId: string) {
    const next = { ...answers, [question.id]: optionId };
    if (qi < quizQuestions.length - 1) {
      setAnswers(next);
      setDirection("forward");
      setQi(qi + 1);
    } else {
      const result = finishQuiz(next);
      if (result) trackQuizCompleted(result.dominant); // quiz_completed { archetype }
      router.replace("/results");
    }
  }

  function back() {
    if (qi > 0) {
      setDirection("back");
      setQi(qi - 1);
    } else {
      router.back();
    }
  }

  return (
    <View
      className="flex-1 bg-bg"
      style={{
        paddingTop: Math.max(screen.top, insets.top),
        paddingHorizontal: screen.x,
        paddingBottom: Math.max(screen.bottom, insets.bottom)
      }}
    >
      <View className="flex-row items-center mb-6" style={{ gap: 12 }}>
        <Pressable onPress={back} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={color.muted} />
        </Pressable>
        <View className="flex-1 bg-rule rounded-pill overflow-hidden" style={{ height: 6 }}>
          <View style={{ height: "100%", width: `${progress * 100}%`, backgroundColor: color.brand }} />
        </View>
        <Text
          className="font-display-medium text-dim"
          style={{ fontSize: 12, minWidth: 40, textAlign: "right" }}
        >
          {qi + 1} / {quizQuestions.length}
        </Text>
      </View>

      {/* Keyed on qi so each question fades/slides in — direction follows nav. */}
      <Animated.View
        key={qi}
        entering={(direction === "back" ? FadeInLeft : FadeInRight).duration(220)}
      >
        <Text
          className="font-display-medium text-text"
          style={{ fontSize: 29, lineHeight: 29 * 1.2, letterSpacing: 29 * -0.015 }}
        >
          {question.prompt}
        </Text>
        <Text className="font-display text-muted mt-2 mb-6" style={{ fontSize: 13.5 }}>
          {question.helper}
        </Text>

        {question.options.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => pick(o.id)}
            className="bg-surface border border-line rounded-option mb-2 active:opacity-80"
            style={{ padding: 15 }}
          >
            <Text
              className="font-display text-body-strong"
              style={{ fontSize: 14, lineHeight: 14 * 1.35 }}
            >
              {o.label}
            </Text>
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
}
