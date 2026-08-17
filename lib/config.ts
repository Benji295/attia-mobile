import type { AttiaEnv } from "./analyticsEnv";

// API base for the ATTIA Places proxy. Override per-environment with
// EXPO_PUBLIC_ATTIA_API_BASE (EXPO_PUBLIC_ prefix => inlined into the bundle).
export const ATTIA_API_BASE =
  process.env.EXPO_PUBLIC_ATTIA_API_BASE ?? "https://attia-six.vercel.app";

// Which analytics bucket this build reports into (OAT-94). `development` is
// decided by the build itself, never by env — a local Metro session must not be
// able to point at a real project by accident. preview/production come from env.
export const ATTIA_ENV: AttiaEnv = __DEV__
  ? "development"
  : ((process.env.EXPO_PUBLIC_ATTIA_ENV as AttiaEnv | undefined) ?? "production");

// PostHog product analytics (OAT-6). The phc_ key is a write-only client key,
// safe to ship in the bundle — but NOT hardcoded here (OAT-94): the value
// decides which project receives the data, and preview must not land in
// production's. Supplied per environment via EXPO_PUBLIC_POSTHOG_KEY; a missing
// key warns loudly rather than no-opping (see lib/analyticsEnv).
export const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
export const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
