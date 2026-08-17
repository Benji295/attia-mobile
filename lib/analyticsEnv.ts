/**
 * Which analytics bucket a build reports into (OAT-94).
 *
 * Stakeholder traffic on the web preview was landing in the same PostHog project
 * as real usage, which quietly corrupts every funnel measured there — most
 * importantly quiz_chapter_reached, whose entire job is abandonment.
 *
 * The decision is a pure function so it can be tested without constructing a
 * client, and so the three cases are readable in one place.
 */

export type AttiaEnv = "development" | "preview" | "production";

export type AnalyticsPlan =
  /** Local Metro: nothing leaves the device. Call sites log so they stay verifiable. */
  | { mode: "console" }
  /** A real bucket, with the key for it. */
  | { mode: "send"; key: string }
  /** Non-dev build with no key — a configuration error, never silent. */
  | { mode: "disabled"; warning: string };

export function planAnalytics(env: AttiaEnv, key: string | undefined): AnalyticsPlan {
  if (env === "development") return { mode: "console" };

  const trimmed = key?.trim();
  if (!trimmed) {
    return {
      mode: "disabled",
      warning:
        `[attia analytics] EXPO_PUBLIC_POSTHOG_KEY is not set for the "${env}" build, ` +
        "so NO events will be sent. Set it in eas.json (preview/production env) " +
        "or in the EAS dashboard. See OAT-94."
    };
  }
  return { mode: "send", key: trimmed };
}
