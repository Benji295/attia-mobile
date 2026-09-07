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
import {
  liveActivities,
  renderOverlay,
  renderScreen,
  seedEmpty,
  seedWithResult,
  textOf,
  unmountActed
} from "./renderScreen";
import { placeBody, streetAddress } from "../lib/activities/placeDetail";

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

/**
 * OAT-44 — the place detail overlay, in both states.
 *
 * The overlay is pure state inside Discover: mounted or not. So "closed" is
 * asserted on Discover (its affordances must be absent), and "open" is asserted
 * by mounting the overlay itself with a real activity.
 *
 * The rating-fallback case gets its own render because that is the one that
 * looks broken if it regresses — 3 of the 60 live activities have no editorial
 * summary, and setting their rating string as a paragraph reads as leaked data.
 */
describe("place detail overlay (OAT-44)", () => {
  const live = liveActivities();
  const prose = live.find((a) => placeBody(a)?.kind === "prose")!;
  const rating = live.find((a) => placeBody(a)?.kind === "rating")!;

  it("is CLOSED on Discover — no detail affordances leak into the deck", async () => {
    await seedWithResult();
    const r = await renderScreen(Discover);
    const text = textOf(r);
    expect(text).toContain("Discover");
    expect(text).not.toContain("Open in Maps");
    await unmountActed(r);
  });

  it("is OPEN: renders the title, body, address and both actions", async () => {
    const r = await renderOverlay(prose);
    const text = textOf(r);
    expect(text.trim().length).toBeGreaterThan(0);
    expect(text).toContain(prose.title);
    expect(text).toContain(prose.category);
    expect(text).toContain(prose.priceLevel);
    expect(text).toContain(prose.descriptionShort); // the body, at reading size
    expect(text).toContain(streetAddress(prose)!);
    expect(text).toContain("Open in Maps");
    expect(text).toContain("Save");
    await unmountActed(r);
  });

  it("shows Saved rather than Save once the place is saved", async () => {
    const r = await renderOverlay(prose, { isSaved: true });
    expect(textOf(r)).toContain("Saved");
    await unmountActed(r);
  });

  it("degrades gracefully for the 3/60 with no editorial prose", async () => {
    const r = await renderOverlay(rating);
    const text = textOf(r);
    const body = placeBody(rating);
    if (body?.kind !== "rating") throw new Error("expected a rating body");
    // The type and the rating are shown as separate fields...
    expect(text).toContain(body.placeType);
    expect(text).toContain(body.rating);
    // ...and never as the raw "· 4.8★ (34,270 reviews)" sentence.
    expect(text).not.toContain("★");
    expect(text).toContain("Open in Maps");
    await unmountActed(r);
  });

  it("carries NONE of the excluded rank claims (OAT-107/108)", async () => {
    for (const a of [prose, rating]) {
      const r = await renderOverlay(a);
      const text = textOf(r);
      expect(text).not.toContain("Top match");
      expect(text).not.toContain("% match");
      expect(text).not.toContain("Highly Rated");
      // neighborhood is 43/60 just the city name — excluded by the brief.
      expect(text).not.toContain(`${a.neighborhood} · `);
      await unmountActed(r);
    }
  });
});
