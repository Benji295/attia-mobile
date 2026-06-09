import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { activities as seedActivities } from "../../data/activities";
import { activityMatchPercentage, getPersonalityProfile } from "../../lib/scoring/recommendations";
import { personalityIds, type Activity } from "../../types";
import { useAttia } from "../../lib/store";

const CITY_LABEL = "Washington DC";
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
  const { saved, result, activityCache } = useAttia();

  // Resolve saved ids from the live cache, falling back to the static seed.
  const items = useMemo(() => {
    const byId: Record<string, Activity> = {};
    for (const a of seedActivities) byId[a.id] = a;
    Object.assign(byId, activityCache);
    return saved.map((id) => byId[id]).filter(Boolean) as Activity[];
  }, [saved, activityCache]);

  if (items.length === 0) {
    return (
      <View className="flex-1 bg-white px-5 items-center justify-center" style={{ paddingTop: insets.top + 8 }}>
        <Ionicons name="map-outline" size={34} color="#A3A3A3" />
        <Text className="text-base text-neutral-500 mt-2 text-center" style={{ maxWidth: 260 }}>
          No stops yet. Save activities in Discover and they'll plan out here.
        </Text>
        <Pressable
          onPress={() => router.push("/discover")}
          className="mt-4 bg-neutral-900 rounded-2xl px-6 py-3 active:opacity-80"
        >
          <Text className="text-white text-sm font-medium">Go to Discover</Text>
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
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 8 }}>
      <View className="px-5">
        <Text className="text-2xl font-medium text-neutral-900">Itinerary</Text>
        <View className="flex-row items-center mt-1" style={{ gap: 4 }}>
          <Ionicons name="location-outline" size={14} color="#737373" />
          <Text className="text-sm text-neutral-500">
            {CITY_LABEL} · {stopLabel}
          </Text>
        </View>
      </View>

      <ScrollView
        className="px-5 mt-5"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {groups.map((group) => (
          <View key={group.time} className="mb-6">
            <Text className="text-xs font-medium text-neutral-400 uppercase mb-3" style={{ letterSpacing: 1 }}>
              {group.time}
            </Text>

            {group.stops.map((a) => (
              <View
                key={a.id}
                className="flex-row border border-neutral-200 rounded-2xl overflow-hidden mb-3"
              >
                <View style={{ width: 4, backgroundColor: accentFor(a) }} />
                <View className="flex-1 px-4 py-3">
                  <Text className="text-base font-medium text-neutral-900">{a.title}</Text>
                  <Text className="text-xs text-neutral-400 mt-1">
                    {a.neighborhood} · {a.category} · {a.priceLevel}
                  </Text>
                </View>
                {result && (
                  <View className="justify-center pr-4">
                    <Text className="text-sm font-medium" style={{ color: accentFor(a) }}>
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
