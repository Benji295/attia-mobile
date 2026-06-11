import PostHog from "posthog-react-native";
import { POSTHOG_KEY, POSTHOG_HOST } from "./config";
import { isHighMatch } from "./feedback";

// Single source for product analytics (same pattern as lib/feedback.ts): screens
// call the named helpers, never posthog directly. One client instance, shared
// with the PostHogProvider in app/_layout.tsx via its `client` prop.
//
// PRIVACY: anonymous, device-level only. No identify(), no names/emails — we have
// no accounts. Autocapture + session replay are disabled (provider + options), so
// the only events sent are the explicit ones below.
export const posthog = new PostHog(POSTHOG_KEY, {
  host: POSTHOG_HOST,
  enableSessionReplay: false
});

type EventProps = Record<string, string | number | boolean | null>;

/** Low-level passthrough. Prefer the named helpers below. */
export function track(event: string, props?: EventProps): void {
  posthog.capture(event, props);
}

export type MatchTier = "high" | "mid" | "low";

// Relative tiering off the user's OWN match range (same cut as isHighMatch, so
// "high" here === a Tier-2 celebration). Cut points, on the range [min, max]:
//   high: match >= max - 0.15*(max-min)   (top 15% — identical to isHighMatch)
//   low:  match <= min + 0.15*(max-min)   (bottom 15%)
//   mid:  everything between
// Degenerate sets (<2 items or no spread) → "mid".
export function matchTier(match: number, allMatches: number[]): MatchTier {
  if (isHighMatch(match, allMatches)) return "high";
  if (allMatches.length < 2) return "mid";
  const max = Math.max(...allMatches);
  const min = Math.min(...allMatches);
  if (max <= min) return "mid";
  if (match <= min + 0.15 * (max - min)) return "low";
  return "mid";
}

// --- Ratified funnel events (OAT-7 metrics doc — exactly these) ---------------

export function trackQuizStarted(): void {
  track("quiz_started");
}

export function trackQuizCompleted(archetype: string): void {
  track("quiz_completed", { archetype });
}

export function trackArchetypeRevealed(archetype: string): void {
  track("archetype_revealed", { archetype });
}

/** Core thesis signal — matchPercent + matchTier answer "do people save their good matches." */
export function trackActivitySaved(p: {
  activityId: string;
  category: string;
  matchPercent: number;
  matchTier: MatchTier;
}): void {
  track("activity_saved", p);
}

export function trackActivitySkipped(p: { activityId: string; matchPercent: number }): void {
  track("activity_skipped", p);
}

export function trackItineraryBuilt(stops: number): void {
  track("itinerary_built", { stops });
}

export function trackAppOpened(): void {
  track("app_opened");
}
