import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo } from "react";
import { activities as seedActivities } from "../../data/activities";
import { screen } from "../../lib/theme";
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
    <View
      className="flex-1 bg-bg"
      style={{ paddingTop: Math.max(screen.top, insets.top), paddingHorizontal: screen.x }}
    >
      <Text
        className="font-display-medium text-text mb-4"
        style={{ fontSize: 30, lineHeight: 30 * 1.15, letterSpacing: 30 * -0.015 }}
      >
        Saved
      </Text>
      {items.length === 0 ? (
        <Text className="font-display text-dim mt-8 text-center" style={{ fontSize: 13 }}>
          Nothing saved yet. Heart an activity in Discover.
        </Text>
      ) : (
        items.map((a) => (
          <View
            key={a.id}
            className="bg-surface border border-line rounded-card mb-3"
            style={{ paddingHorizontal: 16, paddingVertical: 14 }}
          >
            <Text
              className="font-display-medium text-text"
              style={{ fontSize: 15, lineHeight: 15 * 1.25 }}
            >
              {a.title}
            </Text>
            <Text className="font-display text-muted mt-1" style={{ fontSize: 11.5 }}>
              {a.neighborhood} · {a.category}
              {result ? ` · ${activityMatchPercentage(a, result.scores)}% match` : ""}
            </Text>
          </View>
        ))
      )}

      {/* Cross-trip notice — only when saves exist under other cities, so the
          list never reads as "everything you saved is gone". */}
      {savedElsewhereCount > 0 && (
        <Text
          className="font-display text-dim border border-line rounded-list mt-4"
          style={{ fontSize: 12.5, lineHeight: 12.5 * 1.5, padding: 14 }}
        >
          {savedElsewhereCount} {savedElsewhereCount === 1 ? "place is" : "places are"} saved under
          your other trips. Saves stay with the city they were found in — they never leak across
          trips.
        </Text>
      )}
    </View>
  );
}
