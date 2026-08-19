import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { accentFor, photoUri } from "../lib/activities/display";
import { color } from "../lib/theme";
import type { Activity } from "../types";

/**
 * The shared activity card (OAT-44).
 *
 * Lifted verbatim out of app/(tabs)/discover.tsx — same markup, same tokens,
 * same content — so that Discover's deck and the place detail overlay stop
 * being two descriptions of one thing.
 *
 * `variant="row"` renders the compact form that app/(tabs)/saved.tsx currently
 * hand-rolls. Saved is NOT changed in this PR (out of scope), but the variant
 * exists and is shaped for it: title, meta line, optional match. Pointing Saved
 * at this is a two-line change whenever someone wants it.
 *
 * The old CATEGORY_ICON map is gone. It keyed 10 seed-era categories
 * ("Wine Bars", "Rooftops") that no live category matches, so it always fell
 * through to one glyph. A single neutral glyph says the same thing honestly,
 * and still covers the seed rows where `image` is "".
 */
export type ActivityCardProps = {
  activity: Activity;
  /** Displayed match %. Omitted in `row` when there is no quiz result. */
  match?: number;
  variant?: "deck" | "row";
  /** The "Top match for you" chip — Discover's existing relative-high rule. */
  highlight?: boolean;
  /** Accent for the highlight chip, from the user's dominant archetype. */
  highlightAccent?: string;
  highlightAccentSoft?: string;
  /** matchReason() output. Archetype-based; makes no ranking claim. */
  reason?: string;
  /** Rendered inside the photo area — Discover passes its drag cues here. */
  photoOverlay?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function ActivityCard({
  activity,
  match,
  variant = "deck",
  highlight = false,
  highlightAccent,
  highlightAccentSoft,
  reason,
  photoOverlay,
  onPress,
  accessibilityLabel
}: ActivityCardProps) {
  const uri = photoUri(activity);

  if (variant === "row") {
    return (
      <View
        className="bg-surface border border-line rounded-card mb-3"
        style={{ paddingHorizontal: 16, paddingVertical: 14 }}
      >
        <Text
          className="font-display-medium text-text"
          style={{ fontSize: 15, lineHeight: 15 * 1.25 }}
        >
          {activity.title}
        </Text>
        <Text className="font-display text-muted mt-1" style={{ fontSize: 11.5 }}>
          {activity.category}
          {typeof match === "number" ? ` · ${match}% match` : ""}
        </Text>
      </View>
    );
  }

  const body = (
    <View className="flex-1 bg-surface border border-line rounded-card overflow-hidden">
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: color.rule }}>
        {/* Neutral fallback sits underneath; the photo covers it when it loads. */}
        <Ionicons name="image-outline" size={56} color={accentFor(activity)} />
        {uri && (
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
          />
        )}
        {typeof match === "number" && (
          <View
            className="absolute top-3 right-3 rounded-pill"
            style={{ backgroundColor: color.bg, paddingHorizontal: 10, paddingVertical: 5 }}
          >
            <Text className="font-display-semibold" style={{ fontSize: 11, color: accentFor(activity) }}>
              {match}% match
            </Text>
          </View>
        )}
        {photoOverlay}
      </View>
      <View className="px-4 py-4">
        {highlight && (
          <View
            className="flex-row items-center self-start rounded-full px-2 py-0.5 mb-2"
            style={{ backgroundColor: highlightAccentSoft }}
          >
            <Ionicons name="star" size={11} color={highlightAccent} />
            <Text className="text-[11px] font-medium ml-1" style={{ color: highlightAccent }}>
              Top match for you
            </Text>
          </View>
        )}
        <Text className="font-display-medium text-text" style={{ fontSize: 18, lineHeight: 18 * 1.22 }}>
          {activity.title}
        </Text>
        <Text className="font-display text-muted mt-1" style={{ fontSize: 11.5 }}>
          {activity.neighborhood} · {activity.category} · {activity.priceLevel}
        </Text>
        {reason ? (
          <Text className="font-display text-body mt-3" style={{ fontSize: 13, lineHeight: 13 * 1.5 }}>
            {reason}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${activity.title}, open details`}
      style={{ flex: 1 }}
    >
      {body}
    </Pressable>
  );
}
