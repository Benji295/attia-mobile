import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { rankActivities, getPersonalityProfile } from "../../lib/scoring/recommendations";
import { getActivities } from "../../lib/places/fetchActivities";
import { photoUri, accentFor } from "../../lib/activities/display";
import { cityLabel } from "../../lib/cities";
import { CitySelector } from "../../components/CitySelector";
import { type Activity } from "../../types";
import { useAttia } from "../../lib/store";

const INK = "#171717";
const BRAND = "#FB923C"; // sunset warmth, from the locked palette

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { result, saved, cityId, cacheActivities, markCityExplored } = useAttia();
  const cityName = cityLabel(cityId);

  const [data, setData] = useState<Activity[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Fetch live activities on mount, exactly like Discover (only when we have a
  // result to rank against). Cache so Saved/Itinerary share the same set.
  useEffect(() => {
    if (!result) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(false);
    getActivities(cityId)
      .then((list) => {
        if (!active) return;
        setData(list);
        cacheActivities(list);
        markCityExplored(cityId);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [result, cityId, reloadKey, cacheActivities, markCityExplored]);

  const ranked = useMemo(
    () => (result && data ? rankActivities(data, cityId, result.scores, result) : []),
    [result, data, cityId]
  );

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }, []);

  // ---- PRE-QUIZ: Direction A editorial hero ----
  if (!result) {
    return (
      <View className="flex-1 bg-white px-5" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }}>
        <View className="flex-1 rounded-3xl overflow-hidden p-7 justify-end" style={{ backgroundColor: INK }}>
          <View className="flex-1 justify-center">
            <Ionicons name="sparkles" size={40} color={BRAND} />
            <Text className="text-xs font-medium mt-5" style={{ color: BRAND, letterSpacing: 2 }}>
              ATTIA
            </Text>
            <Text className="text-4xl font-medium text-white mt-2" style={{ lineHeight: 42 }}>
              Meet your city match before you plan the trip
            </Text>
            <Text className="text-base text-neutral-400 mt-4 leading-6" style={{ maxWidth: 300 }}>
              A quick quiz reads how you travel, then matches you to real places that fit.
            </Text>
          </View>

          <Pressable
            onPress={() => router.push("/quiz")}
            className="bg-white rounded-2xl py-4 active:opacity-80"
          >
            <Text className="text-center text-base font-medium" style={{ color: INK }}>
              Take the quiz
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ---- POST-QUIZ: Direction C personalized feed ----
  const top = getPersonalityProfile(result.dominant);

  const GreetingHeader = (
    <View className="flex-row items-center justify-between mb-6">
      <View className="flex-1 pr-3">
        <Text className="text-2xl font-medium text-neutral-900">{greeting}</Text>
        <Text className="text-sm mt-0.5" style={{ color: top.accent }}>
          {top.name}
        </Text>
      </View>
      <View
        className="rounded-full items-center justify-center"
        style={{ width: 46, height: 46, backgroundColor: top.accentSoft }}
      >
        <Ionicons name="person" size={22} color={top.accent} />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-white px-5" style={{ paddingTop: insets.top + 8 }}>
        {GreetingHeader}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={INK} />
          <Text className="text-sm text-neutral-400 mt-3">Pulling your matches in {cityName}…</Text>
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View className="flex-1 bg-white px-5" style={{ paddingTop: insets.top + 8 }}>
        {GreetingHeader}
        <View className="flex-1 items-center justify-center">
          <Ionicons name="cloud-offline-outline" size={34} color="#A3A3A3" />
          <Text className="text-base text-neutral-500 mt-2 text-center" style={{ maxWidth: 260 }}>
            We couldn't load your feed. Check your connection and try again.
          </Text>
          <Pressable
            onPress={() => setReloadKey((k) => k + 1)}
            className="mt-4 rounded-2xl px-6 py-3 active:opacity-80"
            style={{ backgroundColor: INK }}
          >
            <Text className="text-white text-sm font-medium">Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const hero = ranked[0];
  const grid = ranked.slice(1, 3);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 8 }}>
      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {GreetingHeader}

        {/* City selector — same control as Discover. */}
        <View className="mb-5">
          <CitySelector />
        </View>

        {/* Featured hero — ranked[0], photo-forward. Tap → Discover. */}
        {hero && (
          <Pressable onPress={() => router.navigate("/discover")} className="active:opacity-90">
            <View className="rounded-3xl overflow-hidden" style={{ height: 230, backgroundColor: accentFor(hero.activity) }}>
              {photoUri(hero.activity) && (
                <Image
                  source={{ uri: photoUri(hero.activity)! }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={150}
                />
              )}
              {/* dark scrim for text legibility */}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.32)" }]} />

              <View className="absolute top-3 right-3 bg-white rounded-lg px-2 py-1">
                <Text className="text-sm font-medium" style={{ color: accentFor(hero.activity) }}>
                  {hero.match}% match
                </Text>
              </View>

              <View className="absolute left-4 right-4 bottom-4">
                <Text className="text-xs font-medium text-white/80" style={{ letterSpacing: 1.5 }}>
                  {cityName.toUpperCase()}
                </Text>
                <Text className="text-2xl font-medium text-white mt-1" numberOfLines={2}>
                  {hero.activity.title}
                </Text>
                <Text className="text-sm text-white/80 mt-1">Matched to your energy</Text>
              </View>
            </View>
          </Pressable>
        )}

        {/* Featured right now — ranked[1] & ranked[2]. Tap → Discover. */}
        {grid.length > 0 && (
          <>
            <Text className="text-base font-medium text-neutral-900 mt-7 mb-3">Featured right now</Text>
            <View className="flex-row" style={{ gap: 12 }}>
              {grid.map((item) => (
                <Pressable
                  key={item.activity.id}
                  onPress={() => router.navigate("/discover")}
                  className="flex-1 active:opacity-90"
                >
                  <View className="rounded-2xl overflow-hidden" style={{ height: 130, backgroundColor: accentFor(item.activity) }}>
                    {photoUri(item.activity) && (
                      <Image
                        source={{ uri: photoUri(item.activity)! }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        transition={150}
                      />
                    )}
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.18)" }]} />
                    <View className="absolute top-2 right-2 bg-white rounded-md px-1.5 py-0.5">
                      <Text className="text-xs font-medium" style={{ color: accentFor(item.activity) }}>
                        {item.match}%
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm font-medium text-neutral-900 mt-2" numberOfLines={1}>
                    {item.activity.title}
                  </Text>
                  <Text className="text-xs text-neutral-400 mt-0.5" numberOfLines={1}>
                    {item.activity.neighborhood}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Resume row — only with real saved stops. Tap → Itinerary. */}
        {saved.length > 0 && (
          <Pressable
            onPress={() => router.navigate("/itinerary")}
            className="flex-row items-center border border-neutral-200 rounded-2xl px-4 py-4 mt-7 active:bg-neutral-50"
          >
            <View
              className="rounded-full items-center justify-center mr-3"
              style={{ width: 40, height: 40, backgroundColor: "#F5F5F5" }}
            >
              <Ionicons name="map-outline" size={20} color={INK} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-medium text-neutral-900">Pick up your itinerary</Text>
              <Text className="text-xs text-neutral-400 mt-0.5">
                {saved.length} saved {saved.length === 1 ? "stop" : "stops"} in {cityName}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A3A3A3" />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
