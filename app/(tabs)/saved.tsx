import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo } from "react";
import { activities as seedActivities } from "../../data/activities";
import { activityMatchPercentage } from "../../lib/scoring/recommendations";
import type { Activity } from "../../types";
import { useAttia } from "../../lib/store";

export default function Saved() {
  const insets = useSafeAreaInsets();
  const { activeSaved, savedElsewhereCount, result, activityCache } = useAttia();

  // Resolve the ACTIVE city's saved ids from the live cache, falling back to the
  // static seed. Scoping already happened at write time — activeSaved never
  // contains another city's places.
  const items = useMemo(() => {
    const byId: Record<string, Activity> = {};
    for (const a of seedActivities) byId[a.id] = a;
    Object.assign(byId, activityCache);
    return activeSaved.map((e) => byId[e.id]).filter(Boolean) as Activity[];
  }, [activeSaved, activityCache]);

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

      {/* Cross-trip notice — only when saves exist under other cities, so the
          list never reads as "everything you saved is gone". */}
      {savedElsewhereCount > 0 && (
        <Text className="text-xs text-neutral-400 mt-4 leading-5">
          {savedElsewhereCount} {savedElsewhereCount === 1 ? "place is" : "places are"} saved under
          your other trips. Saves stay with the city they were found in — they never leak across
          trips.
        </Text>
      )}
    </View>
  );
}
