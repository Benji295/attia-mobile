// Explicit globals: TypeScript 6 no longer auto-includes @types/*.
import { describe, expect, it } from "@jest/globals";
import fs from "fs";
import { userImageSource } from "../lib/userImage";
import { archetypeImages } from "../lib/archetypeImages";
import { personalityIds, type PersonalityId, type QuizResult } from "../types";

/**
 * OAT-14 / OAT-105 — "the image that represents this user".
 *
 * The point of the helper is that there is exactly ONE of it: OAT-106's custom
 * photo override and OAT-78's share card must not each grow their own lookup.
 * The structural test at the bottom is what keeps that true.
 */

const resultFor = (dominant: PersonalityId): QuizResult => ({
  dominant,
  secondary: [],
  scores: Object.fromEntries(personalityIds.map((id) => [id, id === dominant ? 10 : 1])) as Record<
    PersonalityId,
    number
  >
});

describe("userImageSource", () => {
  it("resolves every archetype to its own image", () => {
    for (const id of personalityIds) {
      expect(userImageSource(resultFor(id))).toBe(archetypeImages[id]);
    }
  });

  it("returns null with no quiz result, so callers render their own empty state", () => {
    expect(userImageSource(null)).toBeNull();
  });

  it("never returns another archetype's image", () => {
    for (const id of personalityIds) {
      const mine = userImageSource(resultFor(id));
      const others = personalityIds.filter((o) => o !== id).map((o) => archetypeImages[o]);
      expect(others).not.toContain(mine);
    }
  });
});

describe("one lookup, not two", () => {
  const profile = fs.readFileSync("app/(tabs)/profile.tsx", "utf8");
  const home = fs.readFileSync("app/(tabs)/home.tsx", "utf8");

  it("both surfaces read through the shared helper", () => {
    expect(profile).toContain("userImageSource");
    expect(home).toContain("userImageSource");
  });

  it("neither surface reaches past it into the raw image map", () => {
    // If a screen imports archetypeImages directly, OAT-106's override would
    // silently miss it.
    expect(profile).not.toContain("archetypeImages");
    expect(home).not.toContain("archetypeImages");
  });
});
