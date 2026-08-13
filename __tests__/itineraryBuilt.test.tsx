// Explicit globals: TypeScript 6 no longer auto-includes @types/*.
import { beforeEach, describe, expect, it } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { firesItineraryBuilt, computeXp, levelInfo } from "../lib/gamification";
import { mountStore, write, type Store } from "./helpers";

/**
 * OAT-61 follow-up — itinerary_built is an OAT-7 funnel metric and must mean
 * what it says: a multi-stop plan IN ONE CITY.
 *
 * The bug: discover.tsx computed `beforeCount` from the global saved list, so a
 * user with one save each in DC, NYC and Miami fired itinerary_built on the
 * third — three saves, but no city with a plan.
 *
 * Scope note: these drive the real store for the counts and the real
 * firesItineraryBuilt() for the rule — the two things that were wrong. They do
 * not render Discover itself; that needs reanimated/gesture-handler jest setup,
 * which would mean touching package.json (out of scope, see OAT-92).
 */

const DC = "washington-dc";
const NYC = "new-york";
const MIAMI = "miami";

/**
 * Mirrors what discover.tsx#advance does on an actual ADD: read the ACTIVE
 * city's count before the write, then ask the shipped predicate whether
 * itinerary_built fires.
 */
function saveAndWouldFire(store: () => Store, id: string): boolean {
  const beforeInCity = store().activeSaved.length;
  write(() => store().toggleSave(id));
  return firesItineraryBuilt(beforeInCity);
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("itinerary_built fires on a per-city plan, never a global tally", () => {
  it("three saves in three different cities do NOT fire it", async () => {
    const { store } = await mountStore();
    const fired: boolean[] = [];

    fired.push(saveAndWouldFire(store, "dc-anacostia-kayak"));
    write(() => store().setCity(NYC));
    fired.push(saveAndWouldFire(store, "nyc-place-under-test"));
    write(() => store().setCity(MIAMI));
    fired.push(saveAndWouldFire(store, "miami-place-under-test"));

    expect(fired).toEqual([false, false, false]);
    expect(fired.some(Boolean)).toBe(false);

    // The regression, stated: the global count DID reach 3 — the old rule
    // (`beforeCount === 2` on the global list) would have fired here.
    expect(store().saved).toHaveLength(3);
    expect(store().activeSaved).toHaveLength(1);
    expect(firesItineraryBuilt(2)).toBe(true); // what the global count would have passed
  });

  it("three saves in ONE city fire it exactly once, on the third", async () => {
    const { store } = await mountStore();

    expect(saveAndWouldFire(store, "dc-anacostia-kayak")).toBe(false);
    expect(saveAndWouldFire(store, "dc-speakeasy-tasting")).toBe(false);
    expect(saveAndWouldFire(store, "dc-hirshhorn-after-hours")).toBe(true);

    // ...and not again on a fourth stop in the same city.
    expect(saveAndWouldFire(store, "dc-wharf-oysters")).toBe(false);
    expect(store().activeSaved).toHaveLength(4);
  });

  it("two in one city plus one elsewhere does not fire it", async () => {
    const { store } = await mountStore();

    expect(saveAndWouldFire(store, "dc-anacostia-kayak")).toBe(false);
    expect(saveAndWouldFire(store, "dc-speakeasy-tasting")).toBe(false);
    write(() => store().setCity(MIAMI));
    expect(saveAndWouldFire(store, "miami-place-under-test")).toBe(false);

    expect(store().saved).toHaveLength(3); // global says 3...
    expect(store().activeSaved).toHaveLength(1); // ...no city has a plan
  });

  it("a second city reaching three stops fires it on its own third save", async () => {
    const { store } = await mountStore();

    saveAndWouldFire(store, "dc-anacostia-kayak");
    saveAndWouldFire(store, "dc-speakeasy-tasting");
    expect(saveAndWouldFire(store, "dc-hirshhorn-after-hours")).toBe(true); // DC's plan

    write(() => store().setCity(MIAMI));
    expect(saveAndWouldFire(store, "miami-1")).toBe(false);
    expect(saveAndWouldFire(store, "miami-2")).toBe(false);
    expect(saveAndWouldFire(store, "miami-3")).toBe(true); // Miami's own plan
  });

  it("the per-city count does not disturb XP or level, which stay global", async () => {
    const { store } = await mountStore();

    saveAndWouldFire(store, "dc-anacostia-kayak");
    write(() => store().setCity(NYC));
    saveAndWouldFire(store, "nyc-1");
    write(() => store().setCity(MIAMI));
    saveAndWouldFire(store, "miami-1");

    // No itinerary_built anywhere above, yet the score still counts all three.
    expect(store().saved).toHaveLength(3);
    const xp = computeXp(true, store().saved.length);
    expect(xp).toBe(computeXp(true, 3));
    expect(levelInfo(xp).level).toBe(levelInfo(computeXp(true, 3)).level);
  });
});

describe("firesItineraryBuilt", () => {
  it("is the 2 -> 3 transition and nothing else", () => {
    expect(firesItineraryBuilt(0)).toBe(false);
    expect(firesItineraryBuilt(1)).toBe(false);
    expect(firesItineraryBuilt(2)).toBe(true);
    expect(firesItineraryBuilt(3)).toBe(false);
    expect(firesItineraryBuilt(10)).toBe(false);
  });
});
