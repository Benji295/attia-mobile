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

// --- Render smoke tests (OAT-92) -------------------------------------------
// Gesture handler needs its Jest setup. Reanimated needs no mock here: the
// resolver in package.json (react-native-worklets/jest/resolver.js) makes
// worklets resolve its non-native build, which is what the shipped
// react-native-reanimated/mock could not do on its own — it imports the real
// module and trips the native check.
require("react-native-gesture-handler/jestSetup");

// expo-router has no navigator in a unit test. The screens only ever call the
// imperative API, so a recording stub is enough — and it keeps navigation out of
// a test whose only question is "does this mount".
jest.mock("expo-router", () => {
  const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() };
  return {
    __esModule: true,
    router,
    useRouter: () => router,
    useLocalSearchParams: () => ({}),
    usePathname: () => "/",
    Link: ({ children }) => children,
    Stack: Object.assign(() => null, { Screen: () => null }),
    Tabs: Object.assign(() => null, { Screen: () => null })
  };
});

// The Places proxy is a network call. Screens get the real seed data instead, so
// a smoke test never depends on a server being up.
jest.mock("./lib/places/fetchActivities", () => {
  const { activities } = require("./data/activities");
  return {
    __esModule: true,
    getActivities: jest.fn(async () => activities),
    PlacesFetchError: class PlacesFetchError extends Error {}
  };
});

// Confetti reaches for native timing APIs on mount; the reveal's render is what
// is under test, not the burst.
jest.mock("react-native-confetti-cannon", () => ({ __esModule: true, default: () => null }));
