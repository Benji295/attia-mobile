// API base for the ATTIA Places proxy. Override per-environment with
// EXPO_PUBLIC_ATTIA_API_BASE (EXPO_PUBLIC_ prefix => inlined into the bundle).
export const ATTIA_API_BASE =
  process.env.EXPO_PUBLIC_ATTIA_API_BASE ?? "https://attia-six.vercel.app";
