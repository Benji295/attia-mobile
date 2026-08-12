// Explicit globals: TypeScript 6 no longer auto-includes @types/*.
import { beforeEach, describe, expect, it } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { activities as seedActivities } from "../data/activities";
import { computeXp, levelInfo, CITY_HOPPER_MIN_CITIES } from "../lib/gamification";
import type { Activity } from "../types";
import { mountStore, write, type Store } from "./helpers";

/**
 * OAT-61 — a save must stay with the city it was made in.
 *
 * The bug these protect against: `saved` was a flat string[] of activity ids
 * with no city, so every list resolved against whatever city was selected —
 * a Miami save rendered under a "Washington DC" itinerary header.
 *
 * These drive the real AttiaProvider, so a pass means the shipped write path
 * (toggleSave -> stamp activeCityId()) and the shipped read paths (activeSaved,
 * isSaved, citiesExplored) are the ones under test.
 */

const DC = "washington-dc";
const MIAMI = "miami";

// Real ids from data/activities.ts — no invented places. Miami/NYC activities are
// fetched live from the Places proxy and have no offline fixture, so the Miami
// side asserts on the saved entry itself (the layer the bug lived at).
const DC_ACTIVITY = seedActivities[0].id; // "dc-anacostia-kayak"
const DC_ACTIVITY_2 = seedActivities[1].id;
const MIAMI_PLACE = "miami-place-under-test";
const MIAMI_PLACE_2 = "miami-place-under-test-2";

/** Exactly what Saved / Itinerary do: resolve the ACTIVE city's entries. */
function renderedList(store: Store): Activity[] {
  const byId: Record<string, Activity> = {};
  for (const a of seedActivities) byId[a.id] = a;
  Object.assign(byId, store.activityCache);
  return store.activeSaved.map((e) => byId[e.id]).filter(Boolean) as Activity[];
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("saves are scoped to the city they were made in", () => {
  it("save in Miami, switch to DC -> DC's list is empty and the Miami save is intact", async () => {
    const { store } = await mountStore();

    write(() => store().setCity(MIAMI));
    write(() => store().toggleSave(MIAMI_PLACE));

    expect(store().activeSaved).toEqual([{ id: MIAMI_PLACE, cityId: MIAMI }]);

    write(() => store().setCity(DC));

    // The reported bug, asserted directly.
    expect(store().activeSaved).toEqual([]);
    expect(renderedList(store())).toEqual([]);
    expect(store().isSaved(MIAMI_PLACE)).toBe(false);

    // ...and nothing was lost: the Miami save is still there, still Miami's.
    expect(store().saved).toEqual([{ id: MIAMI_PLACE, cityId: MIAMI }]);
    expect(store().savedElsewhereCount).toBe(1);

    write(() => store().setCity(MIAMI));
    expect(store().activeSaved).toEqual([{ id: MIAMI_PLACE, cityId: MIAMI }]);
    expect(store().isSaved(MIAMI_PLACE)).toBe(true);
  });

  it("the reverse: save in DC, switch to Miami -> Miami's list is empty, DC's save intact", async () => {
    const { store } = await mountStore();

    expect(store().activeCityId()).toBe(DC); // DEFAULT_CITY
    write(() => store().toggleSave(DC_ACTIVITY));

    expect(renderedList(store()).map((a) => a.id)).toEqual([DC_ACTIVITY]);

    write(() => store().setCity(MIAMI));

    expect(store().activeSaved).toEqual([]);
    expect(renderedList(store())).toEqual([]);
    expect(store().isSaved(DC_ACTIVITY)).toBe(false);

    write(() => store().setCity(DC));
    expect(store().activeSaved).toEqual([{ id: DC_ACTIVITY, cityId: DC }]);
    expect(renderedList(store()).map((a) => a.id)).toEqual([DC_ACTIVITY]);
  });

  it("an itinerary stop added in one city never appears in another city's itinerary", async () => {
    // An itinerary stop IS a save today (the Itinerary tab derives from the
    // saved list and groups by idealTime — there is no plan-entry model until
    // OAT-21 adds day/slot to SavedEntry).
    const { store } = await mountStore();

    write(() => store().toggleSave(DC_ACTIVITY)); // DC stop
    write(() => store().setCity(MIAMI));
    write(() => store().toggleSave(MIAMI_PLACE)); // Miami stop

    expect(store().activeSaved.map((e) => e.id)).toEqual([MIAMI_PLACE]);
    expect(store().activeSaved.map((e) => e.id)).not.toContain(DC_ACTIVITY);

    write(() => store().setCity(DC));
    expect(store().activeSaved.map((e) => e.id)).toEqual([DC_ACTIVITY]);
    expect(store().activeSaved.map((e) => e.id)).not.toContain(MIAMI_PLACE);

    // Both stops still exist globally — scoped, not deleted.
    expect(store().saved).toHaveLength(2);
  });

  it("un-saving in one city does not touch the other city's save", async () => {
    const { store } = await mountStore();

    write(() => store().toggleSave(DC_ACTIVITY));
    write(() => store().setCity(MIAMI));
    write(() => store().toggleSave(MIAMI_PLACE));
    write(() => store().toggleSave(MIAMI_PLACE)); // un-save, in Miami

    expect(store().activeSaved).toEqual([]);
    write(() => store().setCity(DC));
    expect(store().activeSaved).toEqual([{ id: DC_ACTIVITY, cityId: DC }]);
  });

  it("persists the city on each save, so a relaunch cannot re-scope it", async () => {
    const first = await mountStore();
    write(() => first.store().setCity(MIAMI));
    write(() => first.store().toggleSave(MIAMI_PLACE));
    first.unmount();

    // Relaunch and land on DC — the Miami save must not follow the user here.
    const second = await mountStore();
    expect(second.store().saved).toEqual([{ id: MIAMI_PLACE, cityId: MIAMI }]);
    write(() => second.store().setCity(DC));
    expect(second.store().activeSaved).toEqual([]);
  });
});

describe("the cross-trip notice counts only other cities' saves", () => {
  it("is zero when every save belongs to the active city", async () => {
    const { store } = await mountStore();
    write(() => store().toggleSave(DC_ACTIVITY));
    write(() => store().toggleSave(DC_ACTIVITY_2));
    expect(store().savedElsewhereCount).toBe(0);
  });

  it("counts saves under other cities", async () => {
    const { store } = await mountStore();
    write(() => store().toggleSave(DC_ACTIVITY));
    write(() => store().setCity(MIAMI));
    write(() => store().toggleSave(MIAMI_PLACE));
    write(() => store().toggleSave(MIAMI_PLACE_2));

    expect(store().savedElsewhereCount).toBe(1); // the DC one
    write(() => store().setCity(DC));
    expect(store().savedElsewhereCount).toBe(2); // the two Miami ones
  });
});

describe("XP, level and cities-explored stay global (Snapchat-score model)", () => {
  it("XP and level count every city's saves, not the active city's", async () => {
    const { store } = await mountStore();

    write(() => store().toggleSave(DC_ACTIVITY));
    write(() => store().toggleSave(DC_ACTIVITY_2));
    write(() => store().setCity(MIAMI));
    write(() => store().toggleSave(MIAMI_PLACE));
    write(() => store().toggleSave(MIAMI_PLACE_2));
    write(() => store().setCity("new-york"));
    write(() => store().toggleSave("nyc-place-under-test"));

    // Global count drives XP...
    expect(store().saved).toHaveLength(5);
    const xp = computeXp(true, store().saved.length);
    expect(xp).toBe(computeXp(true, 5)); // 50 + 5*10 + 30 full-day = 130
    expect(levelInfo(xp).level).toBe(2);

    // ...while the active city's list stays scoped to one stop.
    expect(store().activeSaved).toHaveLength(1);
    // A city-scoped XP would have been level 1 here — that is the regression.
    expect(levelInfo(computeXp(true, store().activeSaved.length)).level).toBe(1);
  });

  it("a save in a second city increments XP just like the first city's saves", async () => {
    const { store } = await mountStore();

    write(() => store().toggleSave(DC_ACTIVITY));
    const afterFirst = computeXp(true, store().saved.length);

    write(() => store().setCity(MIAMI));
    write(() => store().toggleSave(MIAMI_PLACE));
    const afterSecond = computeXp(true, store().saved.length);

    expect(afterSecond - afterFirst).toBe(10); // same 10 XP, different city
  });

  it("cities-explored counts 2 after saving in two different cities", async () => {
    const { store } = await mountStore();

    write(() => store().toggleSave(DC_ACTIVITY));
    expect(store().citiesExplored).toEqual([DC]);

    write(() => store().setCity(MIAMI));
    write(() => store().toggleSave(MIAMI_PLACE));

    expect(store().citiesExplored).toEqual([DC, MIAMI]);
    expect(store().citiesExplored).toHaveLength(2);
    // City hopper unlocks off the global set, from either city.
    expect(store().citiesExplored.length >= CITY_HOPPER_MIN_CITIES).toBe(true);
    write(() => store().setCity(DC));
    expect(store().citiesExplored).toHaveLength(2);
  });

  it("cities-explored does not double-count a city with several saves", async () => {
    const { store } = await mountStore();
    write(() => store().toggleSave(DC_ACTIVITY));
    write(() => store().toggleSave(DC_ACTIVITY_2));
    expect(store().citiesExplored).toEqual([DC]);
  });

  it("streak is untouched by city switching", async () => {
    const { store } = await mountStore();
    const before = store().streak;
    write(() => store().setCity(MIAMI));
    write(() => store().toggleSave(MIAMI_PLACE));
    expect(store().streak).toBe(before);
  });
});
