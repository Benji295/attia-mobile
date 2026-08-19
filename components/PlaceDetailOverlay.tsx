import { useEffect, useState } from "react";
import {
  Animated,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { photoUri } from "../lib/activities/display";
import { mapsUrl, placeBody, streetAddress } from "../lib/activities/placeDetail";
import { color, screen } from "../lib/theme";
import type { Activity } from "../types";

/**
 * Place detail overlay (OAT-44) — screen 10, and the thing 3 of 4 testers asked
 * for.
 *
 * WHAT THIS SCREEN DOES NOT DO, and why. OAT-107/108 measured the match model:
 * ordering is near-arbitrary for 34% of New York lists, 44% of live personality
 * scores are the default value 20, and four archetypes have nothing scoring >=80
 * in NY or DC. So there is no honest numeric story to tell here. No match badge,
 * no "top match", no copy comparing this place to another. The place is sold on
 * its own terms: its photo, what it is, and Google's editorial line about it.
 *
 * STATE FIRST, ANIMATION AS DECORATION. Visibility is pure state — the parent
 * mounts this or does not. The only animation is a 24px settle on the sheet,
 * and its start value is the *visible* position offset, so if the animation
 * never runs (as Reanimated's value updates do not on web) the sheet is simply
 * 24px lower and everything still works. Nothing here is reachable only from an
 * animation callback.
 */

// Scrim geometry — read from app/(tabs)/profile.tsx (OAT-14), not re-derived.
// Those alphas were measured against the archetype art to keep text legible
// without veiling the image; the same two-band treatment applies here.
const HERO_H = 260;
const SCRIM_BOTTOM_ALPHA = 0.76;
const SCRIM_TOP_ALPHA = SCRIM_BOTTOM_ALPHA / 2;
const SCRIM_BOTTOM_START = 0.45;
const SCRIM_BOTTOM_FULL = 0.62;
const SCRIM_TOP_CLEAR = 0.25;

export type PlaceDetailOverlayProps = {
  activity: Activity;
  /** matchReason() output — archetype-based, no ranking claim. */
  reason?: string;
  isSaved: boolean;
  onSave: () => void;
  onClose: () => void;
};

export function PlaceDetailOverlay({
  activity,
  reason,
  isSaved,
  onSave,
  onClose
}: PlaceDetailOverlayProps) {
  const uri = photoUri(activity);
  const body = placeBody(activity);
  const address = streetAddress(activity);

  // Decorative only — see the header note. Starts 24px low and settles to 0.
  // Lazy useState rather than useRef().current: the value must be created once,
  // and reading a ref during render is what react-hooks/refs (correctly) flags.
  const [settle] = useState(() => new Animated.Value(24));
  useEffect(() => {
    const a = Animated.timing(settle, {
      toValue: 0,
      duration: 180,
      useNativeDriver: Platform.OS !== "web"
    });
    a.start();
    return () => a.stop();
  }, [settle]);

  // Dismiss (F). Android hardware back closes the overlay instead of leaving
  // the tab. BackHandler is a no-op on react-native-web, so web gets Escape.
  // Browser Back is NOT wired: this is an in-place overlay with no route of its
  // own, so there is no history entry to pop — the documented trade-off of
  // composition (A). Tap-outside and the close button are the web affordances.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const openMaps = () => {
    Linking.openURL(mapsUrl(activity, Platform.OS)).catch(() => {});
  };

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      {/* Tap outside to dismiss. */}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close details"
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.62)" }]}
      />

      <Animated.View
        style={{
          flex: 1,
          marginTop: 64,
          transform: [{ translateY: settle }]
        }}
      >
        <View
          className="flex-1 bg-bg border border-line overflow-hidden"
          style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        >
          <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
            {/* Hero — full-bleed photo, two vertical scrims, image untouched. */}
            <View style={{ height: HERO_H, backgroundColor: color.rule }}>
              {uri ? (
                <Image
                  source={{ uri }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={150}
                  accessible={false}
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Ionicons name="image-outline" size={56} color={color.dim} />
                </View>
              )}

              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <Svg width="100%" height="100%">
                  <Defs>
                    <LinearGradient id="placeTop" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={color.bg} stopOpacity={SCRIM_TOP_ALPHA} />
                      <Stop offset="1" stopColor={color.bg} stopOpacity={0} />
                    </LinearGradient>
                    <LinearGradient id="placeBottom" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={color.bg} stopOpacity={0} />
                      <Stop
                        offset={(SCRIM_BOTTOM_FULL - SCRIM_BOTTOM_START) / (1 - SCRIM_BOTTOM_START)}
                        stopColor={color.bg}
                        stopOpacity={SCRIM_BOTTOM_ALPHA}
                      />
                      <Stop offset="1" stopColor={color.bg} stopOpacity={SCRIM_BOTTOM_ALPHA} />
                    </LinearGradient>
                  </Defs>
                  <Rect x="0" y="0" width="100%" height={HERO_H * SCRIM_TOP_CLEAR} fill="url(#placeTop)" />
                  <Rect
                    x="0"
                    y={HERO_H * SCRIM_BOTTOM_START}
                    width="100%"
                    height={HERO_H * (1 - SCRIM_BOTTOM_START)}
                    fill="url(#placeBottom)"
                  />
                </Svg>
              </View>

              {/* Close affordance, inside the top scrim. */}
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close details"
                className="absolute rounded-pill items-center justify-center active:opacity-80"
                style={{
                  top: 12,
                  right: 12,
                  width: 38,
                  height: 38,
                  backgroundColor: color.bg
                }}
              >
                <Ionicons name="close" size={20} color={color.text} />
              </Pressable>

              {/* Title sits in the bottom scrim, not on the bright band. */}
              <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: screen.x }}>
                <Text
                  className="font-display-medium text-text"
                  style={{ fontSize: 26, lineHeight: 26 * 1.18, letterSpacing: 26 * -0.015 }}
                >
                  {activity.title}
                </Text>
                <Text className="font-display text-muted mt-1" style={{ fontSize: 12.5 }}>
                  {activity.category} · {activity.priceLevel}
                </Text>
              </View>
            </View>

            <View style={{ paddingHorizontal: screen.x, paddingTop: 18 }}>
              {/* The body. Google's editorial line in 57/60 — this is the
                  screen's strongest asset, so it is set at reading size, not
                  caption size. The 3/60 that carry a rating string instead are
                  set as a stat line, because rendering "Transit depot · 4.8★
                  (34,270 reviews)" as a sentence reads as leaked data. */}
              {body?.kind === "prose" && (
                <Text className="font-display text-text" style={{ fontSize: 16, lineHeight: 16 * 1.55 }}>
                  {body.text}
                </Text>
              )}
              {body?.kind === "rating" && (
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <Text className="font-display-medium text-text" style={{ fontSize: 16 }}>
                    {body.placeType}
                  </Text>
                  <View
                    className="flex-row items-center rounded-pill"
                    style={{ gap: 4, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: color.surface }}
                  >
                    <Ionicons name="star" size={12} color={color.brand} />
                    <Text className="font-display-medium" style={{ fontSize: 12.5, color: color.brand }}>
                      {body.rating}
                    </Text>
                    {body.reviews && (
                      <Text className="font-display text-dim" style={{ fontSize: 12 }}>
                        ({body.reviews})
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {reason ? (
                <Text
                  className="font-display text-muted"
                  style={{ fontSize: 13.5, lineHeight: 13.5 * 1.5, marginTop: 16 }}
                >
                  {reason}
                </Text>
              ) : null}

              {address && (
                <View className="flex-row items-start mt-5" style={{ gap: 8 }}>
                  <Ionicons name="location-outline" size={16} color={color.dim} style={{ marginTop: 2 }} />
                  <Text
                    className="font-display text-muted flex-1"
                    style={{ fontSize: 13, lineHeight: 13 * 1.45 }}
                  >
                    {address}
                  </Text>
                </View>
              )}

              <View className="flex-row mt-6" style={{ gap: 10 }}>
                <Pressable
                  onPress={openMaps}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${activity.title} in Maps`}
                  className="flex-row items-center justify-center rounded-list border border-line active:opacity-80"
                  style={{ gap: 7, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: color.surface }}
                >
                  <Ionicons name="map-outline" size={16} color={color.text} />
                  <Text className="font-display-medium text-text" style={{ fontSize: 14.5 }}>
                    Open in Maps
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onSave}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSaved }}
                  accessibilityLabel={isSaved ? `Remove ${activity.title} from saved` : `Save ${activity.title}`}
                  className="flex-1 flex-row items-center justify-center rounded-list active:opacity-80"
                  style={{
                    gap: 7,
                    paddingHorizontal: 18,
                    paddingVertical: 14,
                    backgroundColor: isSaved ? color.surface : color.text,
                    borderWidth: 1,
                    borderColor: isSaved ? color.line : color.text
                  }}
                >
                  <Ionicons
                    name={isSaved ? "heart" : "heart-outline"}
                    size={16}
                    color={isSaved ? color.brand : color.bg}
                  />
                  <Text
                    className="font-display-medium"
                    style={{ fontSize: 14.5, color: isSaved ? color.text : color.bg }}
                  >
                    {isSaved ? "Saved" : "Save"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}
