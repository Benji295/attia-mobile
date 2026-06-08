import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ACTIVITIES } from "../../lib/activities";
import { useAttia } from "../../lib/store";

export default function Discover() {
  const insets = useSafeAreaInsets();
  const { saved, toggleSave } = useAttia();
  const [ci, setCi] = useState(0);
  const activity = ACTIVITIES[ci];

  function advance(save: boolean) {
    if (save && activity) toggleSave(activity.id);
    setCi(ci + 1);
  }

  return (
    <View className="flex-1 bg-white px-5" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-baseline justify-between">
        <Text className="text-2xl font-medium text-neutral-900">Discover</Text>
        {saved.length > 0 && <Text className="text-xs text-neutral-400">{saved.length} saved</Text>}
      </View>
      <View className="flex-row items-center mt-1 mb-4" style={{ gap: 4 }}>
        <Ionicons name="location-outline" size={14} color="#737373" />
        <Text className="text-sm text-neutral-500">Washington DC</Text>
      </View>

      {activity ? (
        <>
          <View className="flex-1 border border-neutral-200 rounded-2xl overflow-hidden">
            <View className="flex-1 bg-neutral-100 items-center justify-center">
              <Ionicons name={activity.icon as any} size={56} color={activity.accent} />
              <View className="absolute top-3 right-3 bg-white border border-neutral-200 rounded-lg px-2 py-1">
                <Text className="text-sm font-medium" style={{ color: activity.accent }}>
                  {activity.match}% match
                </Text>
              </View>
            </View>
            <View className="px-4 py-4">
              <Text className="text-lg font-medium text-neutral-900">{activity.title}</Text>
              <Text className="text-xs text-neutral-400 mt-1">{activity.tags}</Text>
            </View>
          </View>

          <View className="flex-row justify-center items-center py-4" style={{ gap: 34 }}>
            <Pressable
              onPress={() => advance(false)}
              className="border border-neutral-200 rounded-full items-center justify-center active:scale-95"
              style={{ width: 62, height: 62 }}
            >
              <Ionicons name="close" size={28} color="#737373" />
            </Pressable>
            <Pressable
              onPress={() => advance(true)}
              className="border border-neutral-200 rounded-full items-center justify-center active:scale-95"
              style={{ width: 62, height: 62 }}
            >
              <Ionicons name="heart" size={26} color="#171717" />
            </Pressable>
          </View>
        </>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="checkmark-done-outline" size={34} color="#A3A3A3" />
          <Text className="text-base text-neutral-500 mt-2">That's your ATTIA for today.</Text>
          <Pressable onPress={() => setCi(0)} className="mt-4">
            <Text className="text-sm text-neutral-400">Start over</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
