import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import Animated, { FadeInLeft, FadeInRight } from "react-native-reanimated";
import { quizQuestions } from "../data/quiz";
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

  function pick(optionId: string) {
    const next = { ...answers, [question.id]: optionId };
    if (qi < quizQuestions.length - 1) {
      setAnswers(next);
      setDirection("forward");
      setQi(qi + 1);
    } else {
      finishQuiz(next);
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
    <View className="flex-1 bg-white px-5" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom }}>
      <View className="flex-row items-center mb-6" style={{ gap: 12 }}>
        <Pressable onPress={back} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#737373" />
        </Pressable>
        <View className="flex-1 bg-neutral-100 rounded-full overflow-hidden" style={{ height: 6 }}>
          <View style={{ height: "100%", width: `${progress * 100}%`, backgroundColor: "#171717" }} />
        </View>
        <Text className="text-xs text-neutral-400" style={{ minWidth: 40, textAlign: "right" }}>
          {qi + 1} / {quizQuestions.length}
        </Text>
      </View>

      {/* Keyed on qi so each question fades/slides in — direction follows nav. */}
      <Animated.View
        key={qi}
        entering={(direction === "back" ? FadeInLeft : FadeInRight).duration(220)}
      >
        <Text className="text-2xl font-medium text-neutral-900 leading-8">{question.prompt}</Text>
        <Text className="text-sm text-neutral-400 mt-2 mb-6">{question.helper}</Text>

        {question.options.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => pick(o.id)}
            className="border border-neutral-200 rounded-2xl px-4 py-4 mb-3 active:bg-neutral-50"
          >
            <Text className="text-base text-neutral-800">{o.label}</Text>
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
}
