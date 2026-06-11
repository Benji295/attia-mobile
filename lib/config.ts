// API base for the ATTIA Places proxy. Override per-environment with
// EXPO_PUBLIC_ATTIA_API_BASE (EXPO_PUBLIC_ prefix => inlined into the bundle).
export const ATTIA_API_BASE =
  process.env.EXPO_PUBLIC_ATTIA_API_BASE ?? "https://attia-six.vercel.app";

// PostHog product analytics (OAT-6). The phc_ key is a write-only client key,
// safe to ship in the bundle. EXPO_PUBLIC_ so both are inlined.
export const POSTHOG_KEY =
  process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "phc_Cr6U9rJNw4ih7NxTN2QAsSB9kbMpZHUsN5jqP8tCYioR";
export const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
