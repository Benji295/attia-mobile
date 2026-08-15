// Explicit globals: TypeScript 6 no longer auto-includes @types/*.
import { describe, expect, it } from "@jest/globals";
import { blendSentence, hasStrongStreak, STREAK_MIN_RATIO } from "../lib/blend";
import { getPersonalityProfile } from "../lib/scoring/recommendations";
import { personalityIds, type PersonalityId, type QuizResult } from "../types";

/**
 * OAT-102 — the reveal's blend sentence. The rule that matters: only call a
 * secondary a "strong streak" when it actually is one. A 40% streak is a lie
 * the user can feel, and it is the kind of thing that quietly erodes trust in
 * the whole match.
 */

function resultWith(scores: Partial<Record<PersonalityId, number>>): QuizResult {
  const full = Object.fromEntries(personalityIds.map((id) => [id, scores[id] ?? 0])) as Record<
    PersonalityId,
    number
  >;
  const ranking = [...personalityIds].sort((a, b) => full[b] - full[a]);
  return { dominant: ranking[0], secondary: ranking.slice(1, 3), scores: full };
}

describe("the streak threshold", () => {
  it("names the streak when the secondary is at or above 70% of the dominant", () => {
    const r = resultWith({ connoisseur: 100, socialite: 70 });
    expect(hasStrongStreak(r)).toBe(true);
    expect(blendSentence(r)).toBe(
      "Connoisseur, with a strong Socialite streak — you plan carefully, then want the room to be full."
    );
  });

  it("stays silent about it just below the threshold", () => {
    const r = resultWith({ connoisseur: 100, socialite: 69 });
    expect(hasStrongStreak(r)).toBe(false);
    expect(blendSentence(r)).toBe("Connoisseur — you plan carefully.");
    expect(blendSentence(r)).not.toContain("streak");
  });

  it("does not claim a streak at 40%", () => {
    const r = resultWith({ connoisseur: 100, socialite: 40 });
    expect(blendSentence(r)).not.toContain("streak");
  });

  it("handles a lone archetype and an all-zero vector without a fragment", () => {
    const lone = resultWith({ explorer: 12 });
    expect(blendSentence(lone)).toBe("Explorer — you would rather find it than be sent to it.");
    const zero = resultWith({});
    expect(blendSentence(zero)).toMatch(/\.$/);
    expect(blendSentence(zero)).not.toContain("undefined");
  });

  it("uses the threshold constant, not a hardcoded number", () => {
    const dom = 100;
    const atEdge = resultWith({ connoisseur: dom, socialite: dom * STREAK_MIN_RATIO });
    expect(hasStrongStreak(atEdge)).toBe(true);
  });
});

describe("every archetype has usable copy", () => {
  it("all sixteen clauses are present and non-empty", () => {
    for (const id of personalityIds) {
      const p = getPersonalityProfile(id);
      expect(p.dominantClause.length).toBeGreaterThan(0);
      expect(p.secondaryClause.length).toBeGreaterThan(0);
    }
  });

  it("every dominant/secondary pairing produces one clean sentence", () => {
    for (const dominant of personalityIds) {
      for (const secondary of personalityIds) {
        if (dominant === secondary) continue;
        const r = resultWith({ [dominant]: 100, [secondary]: 90 });
        const s = blendSentence(r);
        expect(s.endsWith(".")).toBe(true);
        expect(s).not.toContain("undefined");
        expect(s).not.toContain("The "); // names are shortened
        expect(s.split(" — ")).toHaveLength(2);
      }
    }
  });
});
