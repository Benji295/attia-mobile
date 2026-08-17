// Explicit globals: TypeScript 6 no longer auto-includes @types/*.
import { beforeEach, describe, expect, it } from "@jest/globals";
import Welcome from "../app/index";
import Quiz from "../app/quiz";
import Results from "../app/results";
import Home from "../app/(tabs)/home";
import Discover from "../app/(tabs)/discover";
import Saved from "../app/(tabs)/saved";
import Itinerary from "../app/(tabs)/itinerary";
import Profile from "../app/(tabs)/profile";
import { renderScreen, seedEmpty, seedWithResult, textOf } from "./renderScreen";

/**
 * Render smoke tests (OAT-92).
 *
 * WHY: PR #26 shipped a Rules of Hooks violation that rendered Profile
 * completely blank, with 107/107 tests green and tsc clean. Every test in this
 * repo asserted on logic; none asserted a screen produces pixels. PR #23's web
 * image sizing was invisible for the same reason.
 *
 * The bar is deliberately "it mounts and renders something real", not snapshot
 * matching — a snapshot of #26's blank screen would have been committed as the
 * expected output and told us nothing.
 *
 * Both states are covered because #26's bug lived specifically on the path
 * where a quiz result exists, and the no-result path is the one screens tend to
 * forget.
 */

type Screen = { name: string; Component: React.ComponentType; expect: string };

/** Screens that render content once a quiz result exists. */
const WITH_RESULT: Screen[] = [
  { name: "quiz", Component: Quiz, expect: "Chapter" },
  { name: "results", Component: Results, expect: "You are" },
  { name: "home", Component: Home, expect: "Good" },
  { name: "discover", Component: Discover, expect: "Discover" },
  { name: "saved", Component: Saved, expect: "Saved" },
  { name: "itinerary", Component: Itinerary, expect: "Itinerary" },
  { name: "profile", Component: Profile, expect: "Profile" }
];

/** Screens that render content with an empty store. */
const NO_RESULT: Screen[] = [
  { name: "index", Component: Welcome, expect: "ATTIA" },
  { name: "quiz", Component: Quiz, expect: "Chapter" },
  { name: "home", Component: Home, expect: "quiz" },
  { name: "discover", Component: Discover, expect: "quiz" },
  { name: "saved", Component: Saved, expect: "Saved" },
  { name: "itinerary", Component: Itinerary, expect: "Discover" },
  { name: "profile", Component: Profile, expect: "quiz" }
];

describe("every screen mounts with a quiz result", () => {
  beforeEach(seedWithResult);

  it.each(WITH_RESULT)("$name renders", async ({ Component, expect: anchor }) => {
    const r = await renderScreen(Component);
    const text = textOf(r);
    // A blank screen must fail — this is the assertion #26 needed.
    expect(text.trim().length).toBeGreaterThan(0);
    expect(text).toContain(anchor);
    r.unmount();
  });
});

describe("every screen mounts with an empty store", () => {
  beforeEach(seedEmpty);

  it.each(NO_RESULT)("$name renders", async ({ Component, expect: anchor }) => {
    const r = await renderScreen(Component);
    const text = textOf(r);
    expect(text.trim().length).toBeGreaterThan(0);
    expect(text).toContain(anchor);
    r.unmount();
  });
});

describe("the two redirect states mount without throwing", () => {
  it("index with a result renders its blank hand-off surface, not an error", async () => {
    await seedWithResult();
    const r = await renderScreen(Welcome);
    // Deliberately empty: index hands a returning user to Home. The bar here is
    // that it mounts — a throw would surface as a test failure, not a blank app.
    expect(r.toJSON()).not.toBeNull();
    r.unmount();
  });

  it("results with no result mounts and redirects rather than crashing", async () => {
    await seedEmpty();
    const r = await renderScreen(Results);
    expect(() => r.toJSON()).not.toThrow();
    r.unmount();
  });
});
