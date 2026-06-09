import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo } from "react";
import { activities as seedActivities } from "../../data/activities";
import { activityMatchPercentage } from "../../lib/scoring/recommendations";
import type { Activity } from "../../types";
import { useAttia } from "../../lib/store";

export default function Saved() {
  const insets = useSafeAreaInsets();
  const { saved, result, activityCache } = useAttia();

  // Resolve saved ids from the live cache, falling back to the static seed.
  const items = useMemo(() => {
    const byId: Record<string, Activity> = {};
    for (const a of seedActivities) byId[a.id] = a;
    Object.assign(byId, activityCache);
    return saved.map((id) => byId[id]).filter(Boolean) as Activity[];
  }, [saved, activityCache]);

  return (
    <View className="flex-1 bg-white px-5" style={{ paddingTop: insets.top + 8 }}>
      <Text className="text-2xl font-medium text-neutral-900 mb-4">Saved</Text>
      {items.length === 0 ? (
        <Text className="text-sm text-neutral-400 mt-8 text-center">
          Nothing saved yet. Heart an activity in Discover.
        </Text>
      ) : (
        items.map((a) => (
          <View key={a.id} className="border border-neutral-200 rounded-2xl px-4 py-3 mb-3">
            <Text className="text-base font-medium text-neutral-900">{a.title}</Text>
            <Text className="text-xs text-neutral-400 mt-1">
              {a.neighborhood} · {a.category}
              {result ? ` · ${activityMatchPercentage(a, result.scores)}% match` : ""}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}
