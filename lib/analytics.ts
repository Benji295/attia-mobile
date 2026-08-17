import PostHog from "posthog-react-native";
import { ATTIA_ENV, POSTHOG_KEY, POSTHOG_HOST } from "./config";
import { planAnalytics } from "./analyticsEnv";
import { isHighMatch } from "./feedback";

// Single source for product analytics (same pattern as lib/feedback.ts): screens
// call the named helpers, never posthog directly. One client instance, shared
// with the PostHogProvider in app/_layout.tsx via its `client` prop.
//
// PRIVACY: anonymous, device-level only. No identify(), no names/emails — we have
// no accounts. Autocapture + session replay are disabled (provider + options), so
// the only events sent are the explicit ones below.
//
// BUCKETS (OAT-94): dev logs and sends nothing; preview and production each get
// their own project key from the environment. Event names and payloads are
// untouched — this is plumbing.
const plan = planAnalytics(ATTIA_ENV, POSTHOG_KEY);

if (plan.mode === "disabled") {
  // Loud on purpose. A silent analytics failure is how a release ships with no
  // data and nobody noticing until someone asks for the funnel.
  console.warn(plan.warning);
}

/**
 * The client, or null when nothing should be sent. Null in development so no
 * client is ever constructed there — not merely muted, absent, so lifecycle or
 * feature-flag traffic cannot leak into a real project either.
 */
export const posthog =
  plan.mode === "send"
    ? new PostHog(plan.key, { host: POSTHOG_HOST, enableSessionReplay: false })
    : null;

type EventProps = Record<string, string | number | boolean | null>;

/** Low-level passthrough. Prefer the named helpers below. */
export function track(event: string, props?: EventProps): void {
  if (!posthog) {
    // Dev: the call site stays verifiable without anything leaving the device.
    if (plan.mode === "console") console.log(`[attia analytics] ${event}`, props ?? {});
    return;
  }
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

/**
 * Fired once per chapter, on entry (OAT-101). This is the abandonment signal:
 * where the funnel drops between chapter 1 and chapter 5.
 */
export function trackQuizChapterReached(p: { chapter_id: number; chapter_name: string }): void {
  track("quiz_chapter_reached", p);
}

export function trackArchetypeRevealed(archetype: string): void {
  track("archetype_revealed", { archetype });
}

export function trackCitySelected(city: string): void {
  track("city_selected", { city });
}

/** Core thesis signal — matchPercent + matchTier answer "do people save their good
    matches." `city` lets us read match quality per city. */
export function trackActivitySaved(p: {
  activityId: string;
  category: string;
  matchPercent: number;
  matchTier: MatchTier;
  /** @deprecated Kept so existing PostHog charts keep resolving. Use cityId. */
  city: string;
  /** City the save was stamped with at write time (OAT-61). */
  cityId: string;
}): void {
  track("activity_saved", p);
}

export function trackActivitySkipped(p: { activityId: string; matchPercent: number }): void {
  track("activity_skipped", p);
}

export function trackItineraryBuilt(stops: number): void {
  track("itinerary_built", { stops });
}

export function trackFilterApplied(dimension: string, value: string): void {
  track("filter_applied", { dimension, value });
}

export function trackAppOpened(): void {
  track("app_opened");
}
