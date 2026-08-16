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
import { color, screen, withAlpha } from "../../lib/theme";
import { userImageSource } from "../../lib/userImage";
import { CitySelector } from "../../components/CitySelector";
import { type Activity } from "../../types";
import { useAttia } from "../../lib/store";

const INK = color.text; // primary button fill on dark
const BRAND = color.brand;

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { result, activeSaved, cityId, cacheActivities } = useAttia();
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
  }, [result, cityId, reloadKey, cacheActivities]);

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
      <View
        className="flex-1 bg-bg"
        style={{
          paddingTop: Math.max(screen.top, insets.top),
          paddingHorizontal: screen.x,
          paddingBottom: Math.max(screen.bottom, insets.bottom)
        }}
      >
        <View
          className="flex-1 bg-surface border border-line overflow-hidden p-7 justify-end"
          style={{ borderRadius: 26 }}
        >
          <View className="flex-1 justify-center">
            <Ionicons name="sparkles" size={40} color={BRAND} />
            <Text className="text-xs font-medium mt-5" style={{ color: BRAND, letterSpacing: 2 }}>
              ATTIA
            </Text>
            <Text className="font-display-medium text-text mt-2" style={{ fontSize: 34, lineHeight: 38 }}>
              Meet your city match before you plan the trip
            </Text>
            <Text
              className="font-display text-muted mt-4"
              style={{ fontSize: 14, lineHeight: 14 * 1.6, maxWidth: 300 }}
            >
              A quick quiz reads how you travel, then matches you to real places that fit.
            </Text>
          </View>

          <Pressable
            onPress={() => router.push("/quiz")}
            className="rounded-list active:opacity-80"
            style={{ backgroundColor: color.text, padding: 17 }}
          >
            <Text
              className="font-display-medium text-center"
              style={{ fontSize: 15.5, lineHeight: 15.5, color: color.bg }}
            >
              Take the quiz
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ---- POST-QUIZ: Direction C personalized feed ----
  const top = getPersonalityProfile(result.dominant);
  const avatarImage = userImageSource(result);

  const GreetingHeader = (
    <View className="flex-row items-center justify-between mb-6">
      <View className="flex-1 pr-3">
        <Text
          className="font-display-medium text-text"
          style={{ fontSize: 27, lineHeight: 27 * 1.18, letterSpacing: 27 * -0.015 }}
        >
          {greeting}
        </Text>
        <Text className="font-display mt-1" style={{ fontSize: 13.5, color: top.accent }}>
          {top.name}
        </Text>
      </View>
      {/* Tapping yourself should take you to yourself. 46x46 already clears the
          44pt minimum; hitSlop widens it to 62x62. */}
      <Pressable
        onPress={() => router.navigate("/profile")}
        accessibilityRole="button"
        accessibilityLabel={`Your profile, ${top.name}`}
        hitSlop={8}
        className="rounded-full overflow-hidden border border-line items-center justify-center active:opacity-80"
        style={{ width: 46, height: 46, backgroundColor: withAlpha(top.accent, "washStrong") }}
      >
        {avatarImage ? (
          <Image
            source={avatarImage}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
            // The Pressable's label already names the archetype.
            accessible={false}
          />
        ) : (
          <Ionicons name="person" size={22} color={top.accent} />
        )}
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <View
        className="flex-1 bg-bg"
        style={{ paddingTop: Math.max(screen.top, insets.top), paddingHorizontal: screen.x }}
      >
        {GreetingHeader}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={color.muted} />
          <Text className="font-display text-dim mt-3" style={{ fontSize: 13 }}>
            Pulling your matches in {cityName}…
          </Text>
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View
        className="flex-1 bg-bg"
        style={{ paddingTop: Math.max(screen.top, insets.top), paddingHorizontal: screen.x }}
      >
        {GreetingHeader}
        <View className="flex-1 items-center justify-center">
          <Ionicons name="cloud-offline-outline" size={34} color={color.dim} />
          <Text
            className="font-display text-muted mt-3 text-center"
            style={{ fontSize: 14, lineHeight: 14 * 1.5, maxWidth: 260 }}
          >
            We couldn't load your feed. Check your connection and try again.
          </Text>
          <Pressable
            onPress={() => setReloadKey((k) => k + 1)}
            className="mt-5 rounded-list active:opacity-80"
            style={{ backgroundColor: color.text, paddingHorizontal: 24, paddingVertical: 15 }}
          >
            <Text className="font-display-medium" style={{ fontSize: 15.5, color: color.bg }}>
              Retry
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const hero = ranked[0];
  const grid = ranked.slice(1, 3);

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: Math.max(screen.top, insets.top) }}>
      <ScrollView
        style={{ paddingHorizontal: screen.x }}
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

              <View
                className="absolute top-3 right-3 rounded-pill"
                style={{ backgroundColor: color.bg, paddingHorizontal: 10, paddingVertical: 5 }}
              >
                <Text
                  className="font-display-semibold"
                  style={{ fontSize: 11, color: accentFor(hero.activity) }}
                >
                  {hero.match}% match
                </Text>
              </View>

              <View className="absolute left-4 right-4 bottom-4">
                <Text
                  className="font-display-semibold uppercase"
                  style={{ fontSize: 10, letterSpacing: 10 * 0.2, color: color["text-warm"] }}
                >
                  {cityName.toUpperCase()}
                </Text>
                <Text className="font-display-medium text-text mt-1" style={{ fontSize: 22 }} numberOfLines={2}>
                  {hero.activity.title}
                </Text>
                <Text className="font-display text-body mt-1" style={{ fontSize: 13 }}>
                  Matched to your energy
                </Text>
              </View>
            </View>
          </Pressable>
        )}

        {/* Featured right now — ranked[1] & ranked[2]. Tap → Discover. */}
        {grid.length > 0 && (
          <>
            <Text
              className="font-display-semibold text-dim uppercase mt-7 mb-3"
              style={{ fontSize: 10, letterSpacing: 10 * 0.2 }}
            >
              Featured right now
            </Text>
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
                    <View
                      className="absolute top-2 right-2 rounded-pill"
                      style={{ backgroundColor: color.bg, paddingHorizontal: 8, paddingVertical: 4 }}
                    >
                      <Text
                        className="font-display-semibold"
                        style={{ fontSize: 10, color: accentFor(item.activity) }}
                      >
                        {item.match}%
                      </Text>
                    </View>
                  </View>
                  <Text className="font-display-medium text-text mt-2" style={{ fontSize: 13.5 }} numberOfLines={1}>
                    {item.activity.title}
                  </Text>
                  <Text className="font-display text-meta mt-1" style={{ fontSize: 11.5 }} numberOfLines={1}>
                    {item.activity.neighborhood}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Resume row — only with real saved stops IN THIS CITY. Tap → Itinerary. */}
        {activeSaved.length > 0 && (
          <Pressable
            onPress={() => router.navigate("/itinerary")}
className="flex-row items-center bg-surface border border-line rounded-card mt-7 active:opacity-80"
            style={{ padding: 20 }}
          >
            <View
              className="rounded-full items-center justify-center mr-3"
style={{ width: 40, height: 40, backgroundColor: color.rule }}
            >
              <Ionicons name="map-outline" size={20} color={color.text} />
            </View>
            <View className="flex-1">
              <Text className="font-display-medium text-text" style={{ fontSize: 15 }}>
                Pick up your itinerary
              </Text>
              <Text className="font-display text-muted mt-1" style={{ fontSize: 11.5 }}>
                {activeSaved.length} saved {activeSaved.length === 1 ? "stop" : "stops"} in{" "}
                {cityName}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={color.dim} />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
