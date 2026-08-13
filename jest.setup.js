// Minimal jest setup (OAT-61). AsyncStorage has no native module under Jest, so
// use the in-memory mock the package ships — the store's persistence and the
// legacy migration are exercised against it for real.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// PostHog is a network client with no keys in CI; the app already no-ops without
// them, and no test asserts on delivery.
jest.mock("posthog-react-native", () => {
  class PostHog {
    capture() {}
    identify() {}
  }
  return { __esModule: true, default: PostHog, PostHog };
});
