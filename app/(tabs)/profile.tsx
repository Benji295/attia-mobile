import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PERSONALITIES } from "../../lib/personalities";
import { useAttia } from "../../lib/store";

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { result, reset } = useAttia();
  const top = result ? PERSONALITIES[result.top] : null;

  return (
    <View className="flex-1 bg-white px-5" style={{ paddingTop: insets.top + 8 }}>
      <Text className="text-2xl font-medium text-neutral-900 mb-6">Profile</Text>
      {top ? (
        <View className="border border-neutral-200 rounded-2xl px-4 py-5">
          <Text className="text-sm text-neutral-400">Your archetype</Text>
          <Text className="text-2xl font-medium mt-1" style={{ color: top.accent }}>{top.name}</Text>
          <Text className="text-sm text-neutral-500 mt-2 leading-6">{top.blurb}</Text>
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
    </View>
  );
}
