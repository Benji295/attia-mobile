import * as Haptics from "expo-haptics";
import { AccessibilityInfo } from "react-native";

// One place that wraps haptics + the celebration trigger rules, so every screen
// uses the same API. Haptics fire-and-forget; failures (e.g. simulator/web) are
// swallowed so they never break the save/swipe flow.

// --- Reduce motion -----------------------------------------------------------
let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((v) => {
    reduceMotion = v;
  })
  .catch(() => {});
AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => {
  reduceMotion = v;
});

/** True when the OS "Reduce Motion" setting is on — callers skip heavy bursts. */
export function prefersReducedMotion(): boolean {
  return reduceMotion;
}

// --- Haptics -----------------------------------------------------------------
/** Tier 1 — light tap on an ordinary save. */
export function hapticLight(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Tier 2/3/4 — success notification for the meaningful moments. */
export function hapticSuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

// --- Tier 2 high-match rule (RELATIVE, documented) ---------------------------
// A saved place is a "high match" when its match % sits in the top 15% of the
// user's OWN match range for the current ranked set:
//   span = max - min;  threshold = max - 0.15 * span;  high = match >= threshold.
// Relative (not a fixed %) because real matches top out ~59% today, so a fixed
// 80% would never fire. Requires at least 2 items and a non-zero spread, so a
// flat/degenerate set never claims a "perfect match".
export function isHighMatch(match: number, allMatches: number[]): boolean {
  if (allMatches.length < 2) return false;
  const max = Math.max(...allMatches);
  const min = Math.min(...allMatches);
  if (max <= min) return false;
  const threshold = max - 0.15 * (max - min);
  return match >= threshold;
}
