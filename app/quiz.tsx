import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { QUIZ } from "../lib/quiz";
import { useAttia } from "../lib/store";

export default function Quiz() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { finishQuiz } = useAttia();
  const [qi, setQi] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);

  const question = QUIZ[qi];

  function pick(key: string) {
    const next = [...picks, key];
    if (qi < QUIZ.length - 1) {
      setPicks(next);
      setQi(qi + 1);
    } else {
      finishQuiz(next);
      router.replace("/results");
    }
  }

  function back() {
    if (qi > 0) {
      setPicks(picks.slice(0, -1));
      setQi(qi - 1);
    } else {
      router.back();
    }
  }

  return (
    <View className="flex-1 bg-white px-5" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom }}>
      <View className="flex-row items-center mb-6">
        <Pressable onPress={back} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#737373" />
        </Pressable>
        <View className="flex-1 flex-row justify-center" style={{ gap: 6 }}>
          {QUIZ.map((_, k) => (
            <View
              key={k}
              style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: k <= qi ? "#171717" : "#E5E5E5" }}
            />
          ))}
        </View>
        <Text className="text-xs text-neutral-400" style={{ minWidth: 34, textAlign: "right" }}>
          {qi + 1} / {QUIZ.length}
        </Text>
      </View>

      <Text className="text-2xl font-medium text-neutral-900 leading-8 mb-6">{question.q}</Text>

      {question.options.map((o) => (
        <Pressable
          key={o.label}
          onPress={() => pick(o.key)}
          className="border border-neutral-200 rounded-2xl px-4 py-4 mb-3 active:bg-neutral-50"
        >
          <Text className="text-base text-neutral-800">{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
