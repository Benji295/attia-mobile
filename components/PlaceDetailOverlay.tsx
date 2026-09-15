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
import {
  HERO_H,
  HERO_PAD,
  SCRIM_BOTTOM_ALPHA,
  SCRIM_BOTTOM_START,
  SCRIM_TOP_ALPHA,
  SCRIM_TOP_CLEAR,
  SUBTITLE_GAP,
  SUBTITLE_LINE_HEIGHT,
  SUBTITLE_SIZE,
  TITLE_LINE_HEIGHT,
  TITLE_SIZE,
  bottomScrimStops
} from "../lib/activities/heroScrim";
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
 * never runs the sheet is simply 24px lower and everything still works.
 * Nothing here is reachable only from an animation callback, and nothing reads
 * an animated value back from JS. That second part matters on web: OAT-110
 * showed Reanimated's completion callbacks DO fire there (finished=true), but
 * reading a shared value's .value from the JS thread returns its initial value.
 * Not depending on either keeps the design correct on every platform.
 *
 * SIZED TO ITS CONTENT, ANCHORED TO THE BOTTOM. The sheet is exactly as tall
 * as what is in it — hero, body, address, actions — with Discover visible and
 * dimmed above it. It is capped at the screen minus SHEET_TOP_GAP; past that
 * the body scrolls and the hero never shrinks. No fixed height, no measuring
 * pass: flexShrink on the sheet and flexGrow: 0 on the ScrollView let Yoga
 * (and the browser) size it in a single layout.
 */

// Hero and scrim geometry lives in lib/activities/heroScrim.ts, where a test
// holds it to the contrast it was measured for. It began as profile.tsx's
// two-band treatment (OAT-14) and diverges on purpose — see that module's
// header. BOTTOM_STOPS is the same geometry mapped onto the bottom <Rect>'s
// own span, since an SVG gradient's offsets are relative to its shape.
const BOTTOM_STOPS = bottomScrimStops();
/** The sheet never comes within this of the top of the screen. */
const SHEET_TOP_GAP = 64;

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
    <View style={[StyleSheet.absoluteFill, { justifyContent: "flex-end" }]} accessibilityViewIsModal>
      {/* Tap outside to dismiss. */}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close details"
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.62)" }]}
      />

      {/* Content-sized: no flex: 1. flexShrink lets it yield to SHEET_TOP_GAP
          when the content is taller than the screen, and the ScrollView's
          flexGrow: 0 keeps it from claiming space the content does not need. */}
      <Animated.View
        style={{
          marginTop: SHEET_TOP_GAP,
          flexShrink: 1,
          transform: [{ translateY: settle }]
        }}
      >
        <View
          className="bg-bg border border-line overflow-hidden"
          style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, flexShrink: 1 }}
        >
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 28 }}>
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
                    {/* Three zones: clear -> 0.76 under the title lines -> opaque
                        under the subtitle, where muted text needs the photo gone. */}
                    <LinearGradient id="placeBottom" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={color.bg} stopOpacity={0} />
                      <Stop offset={BOTTOM_STOPS.full} stopColor={color.bg} stopOpacity={SCRIM_BOTTOM_ALPHA} />
                      <Stop offset={BOTTOM_STOPS.opaque} stopColor={color.bg} stopOpacity={1} />
                      <Stop offset="1" stopColor={color.bg} stopOpacity={1} />
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

              {/* Title sits in the 0.76 band; the subtitle, being muted and
                  small, sits on the opaque zone below it. Geometry from heroScrim. */}
              <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: HERO_PAD }}>
                <Text
                  className="font-display-medium text-text"
                  style={{
                    fontSize: TITLE_SIZE,
                    lineHeight: TITLE_LINE_HEIGHT,
                    letterSpacing: TITLE_SIZE * -0.015
                  }}
                >
                  {activity.title}
                </Text>
                <Text
                  className="font-display text-muted"
                  style={{ fontSize: SUBTITLE_SIZE, lineHeight: SUBTITLE_LINE_HEIGHT, marginTop: SUBTITLE_GAP }}
                >
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
