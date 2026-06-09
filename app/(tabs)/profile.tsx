import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getPersonalityProfile } from "../../lib/scoring/recommendations";
import { useAttia } from "../../lib/store";

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { result, reset } = useAttia();
  const top = result ? getPersonalityProfile(result.dominant) : null;

  return (
    <View className="flex-1 bg-white px-5" style={{ paddingTop: insets.top + 8 }}>
      <Text className="text-2xl font-medium text-neutral-900 mb-6">Profile</Text>
      {top ? (
        <View className="border border-neutral-200 rounded-2xl px-4 py-5">
          <Text className="text-sm text-neutral-400">Your archetype</Text>
          <Text className="text-2xl font-medium mt-1" style={{ color: top.accent }}>
            {top.name}
          </Text>
          <Text className="text-sm text-neutral-500 mt-2 leading-6">{top.summary}</Text>
          <View className="flex-row flex-wrap mt-4" style={{ gap: 8 }}>
            {top.traits.map((t) => (
              <View key={t} className="rounded-full px-3 py-1" style={{ backgroundColor: top.accentSoft }}>
                <Text className="text-xs font-medium" style={{ color: top.accent }}>
                  {t}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Text className="text-sm text-neutral-400">Take the quiz to find your archetype.</Text>
      )}

      <Pressable
        onPress={() => {
          reset();
          router.replace("/");
        }}
        className="mt-6 border border-neutral-200 rounded-2xl py-3 active:bg-neutral-50"
      >
        <Text className="text-sm text-neutral-700 text-center">Retake the quiz</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/how-it-works")} className="mt-4 active:opacity-60" hitSlop={8}>
        <Text className="text-sm text-neutral-400 text-center">How ATTIA works</Text>
      </Pressable>
    </View>
  );
}
