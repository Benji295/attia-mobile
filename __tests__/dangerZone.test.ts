// Explicit globals: TypeScript 6 no longer auto-includes @types/*.
import { describe, expect, it } from "@jest/globals";
import fs from "fs";
import { RESET_PHRASE, isResetConfirmed, resetSummary } from "../lib/dangerZone";

/**
 * OAT-93 — the destructive action.
 *
 * The regression that cost real data: "Retake the quiz" was wired to reset(),
 * which deletes every save. The last test in this file is the one that matters —
 * it asserts retake never reaches reset() again.
 */

describe("type-to-confirm", () => {
  it("accepts only the exact phrase", () => {
    expect(isResetConfirmed("RESET")).toBe(true);
  });

  it("is case-sensitive — the shift key is part of the friction", () => {
    for (const near of ["reset", "Reset", "rESET", "ReSeT"]) {
      expect(isResetConfirmed(near)).toBe(false);
    }
  });

  it("rejects near-misses that a reflexive tap would produce", () => {
    for (const near of ["", " ", "RESE", "RESETT", " RESET", "RESET "]) {
      expect(isResetConfirmed(near)).toBe(false);
    }
  });
});

describe("the confirmation names what actually dies", () => {
  it("reads as the brief specified, with live counts", () => {
    expect(
      resetSummary({ savedPlaces: 4, plannedStops: 4, citiesExplored: 0, archetype: "Socialite" })
    ).toBe("This deletes 4 saved places, 4 planned stops, and your Socialite result. This cannot be undone.");
  });

  it("includes cities explored, which reset() also destroys", () => {
    expect(
      resetSummary({ savedPlaces: 4, plannedStops: 4, citiesExplored: 2, archetype: "Socialite" })
    ).toContain("2 cities explored");
  });

  it("singularises, so it never says '1 saved places'", () => {
    const s = resetSummary({
      savedPlaces: 1,
      plannedStops: 1,
      citiesExplored: 1,
      archetype: "Explorer"
    });
    expect(s).toContain("1 saved place,");
    expect(s).toContain("1 planned stop,");
    expect(s).toContain("1 city explored");
    expect(s).not.toContain("places");
  });

  it("omits zero counts rather than padding with '0 saved places'", () => {
    const s = resetSummary({
      savedPlaces: 0,
      plannedStops: 0,
      citiesExplored: 0,
      archetype: "Connector"
    });
    expect(s).toBe("This deletes your Connector result. This cannot be undone.");
    expect(s).not.toContain("0 ");
  });

  it("stays honest when there is nothing to delete", () => {
    const s = resetSummary({ savedPlaces: 0, plannedStops: 0, citiesExplored: 0, archetype: null });
    expect(s).toContain("nothing saved to delete");
  });

  it("always warns that it cannot be undone", () => {
    for (const n of [0, 1, 9]) {
      expect(
        resetSummary({ savedPlaces: n, plannedStops: n, citiesExplored: n, archetype: "Epicurean" })
      ).toContain("cannot be undone");
    }
  });
});

describe("Retake the quiz never reaches reset() — OAT-93's regression", () => {
  const raw = fs.readFileSync("app/(tabs)/profile.tsx", "utf8");

  /**
   * Comments stripped first. This file explains the regression in prose — "must
   * never reach reset()" — and an assertion that matched that text would pass or
   * fail on the commentary rather than the code.
   */
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  /** The Pressable whose rendered label is "Retake the quiz". */
  const retakeBlock = (() => {
    const label = src.indexOf("Retake the quiz");
    expect(label).toBeGreaterThan(-1);
    const open = src.lastIndexOf("<Pressable", label);
    return src.slice(open, label);
  })();

  it("calls clearResult, the non-destructive path", () => {
    expect(retakeBlock).toContain("clearResult()");
  });

  it("does NOT call reset() — this is the bug that wiped a tester's saves", () => {
    expect(retakeBlock).not.toMatch(/\breset\(\)/);
  });

  it("routes to the quiz, not to a wipe-and-restart", () => {
    expect(retakeBlock).toContain('"/quiz"');
  });

  it("reset() has exactly one call site, and it sits behind the type-to-confirm gate", () => {
    const callSites = src.match(/(?<!clear)\breset\(\)/g) ?? [];
    expect(callSites).toHaveLength(1);
    const resetAt = src.search(/(?<!clear)\breset\(\)/);
    expect(src.indexOf("isResetConfirmed")).toBeLessThan(resetAt);
  });

  it("the danger zone label uses the danger token, not an archetype accent", () => {
    expect(src).toContain("color.danger");
  });

  it("the confirm button is GATED on the typed phrase, not merely styled by it", () => {
    // Caught nothing until it was added: dropping `disabled` left every other
    // assertion green while the destructive action became one tap again.
    expect(src).toMatch(/disabled=\{!isResetConfirmed\(/);
  });

  it("Cancel is the dominant action — filled, where the destructive one is not", () => {
    const cancel = src.slice(src.lastIndexOf("<Pressable", src.indexOf("Cancel")), src.indexOf("Cancel"));
    expect(cancel).toContain("backgroundColor: color.text");
    // The destructive button carries no fill of its own.
    const confirmAt = src.search(/disabled=\{!isResetConfirmed\(/);
    const confirm = src.slice(confirmAt, confirmAt + 700);
    expect(confirm).not.toContain("backgroundColor: color.danger");
  });
});
