import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { activities as seedActivities } from "../../data/activities";
import { activityMatchPercentage, getPersonalityProfile } from "../../lib/scoring/recommendations";
import { cityLabel } from "../../lib/cities";
import { color, screen } from "../../lib/theme";
import { personalityIds, type Activity } from "../../types";
import { useAttia } from "../../lib/store";

// Fixed time-of-day order for grouping (no invented calendar dates).
const TIME_ORDER: Activity["idealTime"][] = ["Morning", "Afternoon", "Evening"];

// Accent from the activity's strongest archetype — same pattern as Discover.
function accentFor(a: Activity) {
  const topId = personalityIds.reduce((best, id) =>
    a.personalityScores[id] > a.personalityScores[best] ? id : best
  );
  return getPersonalityProfile(topId).accent;
}

export default function Itinerary() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeSaved, result, activityCache, cityId } = useAttia();

  // Resolve THIS city's stops from the live cache, falling back to the static
  // seed. An itinerary stop is a save (see SavedEntry) — scoped at write time,
  // so another city's place can never appear under this header.
  const items = useMemo(() => {
    const byId: Record<string, Activity> = {};
    for (const a of seedActivities) byId[a.id] = a;
    Object.assign(byId, activityCache);
    return activeSaved.map((e) => byId[e.id]).filter(Boolean) as Activity[];
  }, [activeSaved, activityCache]);

  if (items.length === 0) {
    return (
      <View
        className="flex-1 bg-bg items-center justify-center"
        style={{ paddingTop: Math.max(screen.top, insets.top), paddingHorizontal: screen.x }}
      >
        <Ionicons name="map-outline" size={34} color={color.dim} />
        <Text
          className="font-display text-muted mt-3 text-center"
          style={{ fontSize: 14, lineHeight: 14 * 1.5, maxWidth: 260 }}
        >
          No stops yet. Save activities in Discover and they'll plan out here.
        </Text>
        <Pressable
          onPress={() => router.push("/discover")}
          className="mt-5 rounded-list active:opacity-80"
          style={{ backgroundColor: color.text, paddingHorizontal: 24, paddingVertical: 15 }}
        >
          <Text className="font-display-medium" style={{ fontSize: 15.5, color: color.bg }}>
            Go to Discover
          </Text>
        </Pressable>
      </View>
    );
  }

  // Group saved stops by time of day; rank within each group by real match %.
  const groups = TIME_ORDER.map((time) => ({
    time,
    stops: items
      .filter((a) => a.idealTime === time)
      .sort((a, b) =>
        result ? activityMatchPercentage(b, result.scores) - activityMatchPercentage(a, result.scores) : 0
      )
  })).filter((g) => g.stops.length > 0);

  const stopLabel = items.length === 1 ? "1 stop" : `${items.length} stops`;

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: Math.max(screen.top, insets.top) }}>
      <View style={{ paddingHorizontal: screen.x }}>
        <Text
          className="font-display-medium text-text"
          style={{ fontSize: 30, lineHeight: 30 * 1.15, letterSpacing: 30 * -0.015 }}
        >
          Itinerary
        </Text>
        <View className="flex-row items-center mt-1" style={{ gap: 4 }}>
          <Ionicons name="location-outline" size={14} color={color.dim} />
          <Text className="font-display text-muted" style={{ fontSize: 13.5 }}>
            {cityLabel(cityId)} · {stopLabel}
          </Text>
        </View>
      </View>

      <ScrollView
        className="mt-5"
contentContainerStyle={{ paddingHorizontal: screen.x, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {groups.map((group) => (
          <View key={group.time} className="mb-6">
            <Text
              className="font-display-semibold text-dim uppercase mb-3"
              style={{ fontSize: 10, letterSpacing: 10 * 0.2 }}
            >
              {group.time}
            </Text>

            {group.stops.map((a) => (
              <View
                key={a.id}
                className="flex-row bg-surface border border-line rounded-list overflow-hidden mb-2"
              >
                <View style={{ width: 3, backgroundColor: accentFor(a) }} />
                <View className="flex-1" style={{ padding: 14 }}>
                  <Text
                    className="font-display-medium text-text"
                    style={{ fontSize: 15, lineHeight: 15 * 1.25 }}
                  >
                    {a.title}
                  </Text>
                  <Text className="font-display text-muted mt-1" style={{ fontSize: 11.5 }}>
                    {a.neighborhood} · {a.category} · {a.priceLevel}
                  </Text>
                </View>
                {result && (
                  <View className="justify-center" style={{ paddingRight: 14 }}>
                    <Text className="font-display-medium" style={{ fontSize: 13, color: accentFor(a) }}>
                      {activityMatchPercentage(a, result.scores)}%
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
