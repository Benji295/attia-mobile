// Explicit globals: TypeScript 6 no longer auto-includes @types/*.
import { beforeEach, describe, expect, it } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { quizQuestions } from "../data/quiz";
import { scoreQuiz } from "../lib/scoring/recommendations";
import { CITY_HOPPER_MIN_CITIES } from "../lib/gamification";
import { mountStore, write, type Store } from "./helpers";

/**
 * OAT-93 — "Retake the quiz" used to call reset(), which deletes every save,
 * badge and explored city. Retaking a quiz is not a request to delete a trip.
 *
 * clearResult() clears the archetype and nothing else; reset() is the wipe, and
 * is now the only thing behind a confirmation.
 */

const DC = "washington-dc";
const MIAMI = "miami";
const STORAGE_KEY = "attia:v1";

/** Varied answers so the result has a real spread. */
const ANSWERS = Object.fromEntries(
  quizQuestions.map((q, i) => [q.id, q.options[i % q.options.length].id])
);

/** A real engine result — no invented score vectors. */
function realResult() {
  return scoreQuiz(quizQuestions, ANSWERS);
}

/** Earn something worth losing: saves in two cities, so City hopper unlocks. */
function earnProgress(store: () => Store) {
  write(() => store().toggleSave("dc-anacostia-kayak"));
  write(() => store().toggleSave("dc-speakeasy-tasting"));
  write(() => store().setCity(MIAMI));
  write(() => store().toggleSave("miami-place-under-test"));
  write(() => store().setCity(DC));
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("Retake the quiz — clearResult()", () => {
  it("clears the archetype and keeps every save, badge and city", async () => {
    const { store } = await mountStore();
    write(() => store().finishQuiz(ANSWERS));
    earnProgress(store);

    expect(store().result).not.toBeNull();
    expect(store().saved).toHaveLength(3);
    expect(store().citiesExplored).toEqual([DC, MIAMI]);

    write(() => store().clearResult());

    // The archetype is gone...
    expect(store().result).toBeNull();
    // ...and nothing the user earned went with it.
    expect(store().saved).toHaveLength(3);
    expect(store().citiesExplored).toEqual([DC, MIAMI]);
    expect(store().citiesExplored.length).toBeGreaterThanOrEqual(CITY_HOPPER_MIN_CITIES);
    expect(store().activeSaved).toHaveLength(2); // DC's two
    expect(store().streak).toBeGreaterThan(0);
  });

  it("survives a relaunch — saves persist, result stays cleared", async () => {
    const first = await mountStore();
    write(() => first.store().finishQuiz(ANSWERS));
    earnProgress(first.store);
    write(() => first.store().clearResult());
    first.unmount();

    const second = await mountStore();
    expect(second.store().result).toBeNull();
    expect(second.store().saved).toHaveLength(3);
    expect(second.store().citiesExplored).toEqual([DC, MIAMI]);

    const persisted = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) as string);
    expect(persisted.result).toBeNull();
    expect(persisted.saved).toHaveLength(3);
  });
});

describe("Reset everything — reset()", () => {
  it("clears the result, the saves AND the cities floor", async () => {
    const { store } = await mountStore();
    write(() => store().finishQuiz(ANSWERS));
    earnProgress(store);

    write(() => store().reset());

    expect(store().result).toBeNull();
    expect(store().saved).toEqual([]);
    expect(store().activeSaved).toEqual([]);
    expect(store().citiesExplored).toEqual([]);
    expect(store().citiesExplored.length).toBeLessThan(CITY_HOPPER_MIN_CITIES);
  });

  it("survives a relaunch — nothing comes back", async () => {
    const first = await mountStore();
    write(() => first.store().finishQuiz(ANSWERS));
    earnProgress(first.store);
    write(() => first.store().reset());

    const persisted = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) as string);
    expect(persisted.saved).toEqual([]);
    expect(persisted.citiesExplored).toEqual([]);
    first.unmount();

    const second = await mountStore();
    expect(second.store().result).toBeNull();
    expect(second.store().saved).toEqual([]);
    expect(second.store().citiesExplored).toEqual([]);
  });
});

describe("the two are genuinely different", () => {
  it("clearResult is not reset — same starting state, different outcome", async () => {
    const a = await mountStore();
    write(() => a.store().finishQuiz(ANSWERS));
    earnProgress(a.store);
    write(() => a.store().clearResult());
    const afterRetake = { saved: a.store().saved.length, cities: a.store().citiesExplored.length };
    a.unmount();

    await AsyncStorage.clear();

    const b = await mountStore();
    write(() => b.store().finishQuiz(ANSWERS));
    earnProgress(b.store);
    write(() => b.store().reset());
    const afterReset = { saved: b.store().saved.length, cities: b.store().citiesExplored.length };

    expect(afterRetake).toEqual({ saved: 3, cities: 2 });
    expect(afterReset).toEqual({ saved: 0, cities: 0 });
    expect(afterRetake).not.toEqual(afterReset);
  });

  it("the engine still produces a real result to clear", () => {
    const r = realResult();
    expect(r).not.toBeNull();
    expect(Object.keys(r!.scores)).toHaveLength(8);
  });
});
