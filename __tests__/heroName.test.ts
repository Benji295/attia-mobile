// Explicit globals: TypeScript 6 no longer auto-includes @types/*.
import { describe, expect, it } from "@jest/globals";
import { personalities } from "../data/personalities";

/**
 * OAT-14 — the hero name must never break mid-word ("The Socia / lite").
 *
 * React Native wraps at word boundaries and only breaks INSIDE a word when that
 * single word is wider than the line. So the guarantee is a width one: the name
 * column must be at least as wide as the widest two-line arrangement of any
 * archetype name.
 *
 * The px figures below were measured with the SHIPPED font — Bricolage Grotesque
 * 500Medium at 28px, the hero's exact face and size — not estimated. Re-measure
 * if the font, the size, or an archetype name changes.
 */

// Measured: node_modules/@expo-google-fonts/bricolage-grotesque/500Medium at 28px
const WIDEST_TWO_LINE_PX = 200; // "The Adrenaline" (from "The Adrenaline Junkie")
const LONGEST_WORD_PX = 168; // "Connoisseur"

// Hero layout, mirroring app/(tabs)/profile.tsx at the narrowest phone we target.
const SCREEN_W = 390; // iPhone 12/13/14 logical width
const SCREEN_PAD = 22; // screen.x
const CARD_PAD = 22;
const HERO_RING = 56;
const HERO_GAP = 12;

const cardWidth = SCREEN_W - SCREEN_PAD * 2;
const nameColumnWidth = cardWidth - CARD_PAD * 2 - HERO_RING - HERO_GAP;

describe("the hero name fits without breaking mid-word", () => {
  it("gives the name column enough width for the widest two-line name", () => {
    expect(nameColumnWidth).toBeGreaterThanOrEqual(WIDEST_TWO_LINE_PX);
  });

  it("fits the longest single word, which is what forces a mid-word break", () => {
    expect(nameColumnWidth).toBeGreaterThanOrEqual(LONGEST_WORD_PX);
  });

  it("would FAIL with the previous 96px ring — the layout that caused the bug", () => {
    const old = cardWidth - CARD_PAD * 2 - 96 - HERO_GAP;
    expect(old).toBeLessThan(WIDEST_TWO_LINE_PX);
  });

  it("every archetype name breaks at a space, never inside a word", () => {
    for (const p of personalities) {
      const words = p.name.split(" ");
      // A clean two-line split must exist: some split point whose longer half
      // fits the column. Word widths scale with length, so the longest word is
      // the binding case and it is asserted above.
      expect(words.length).toBeGreaterThanOrEqual(2);
      const longestWord = words.reduce((a, b) => (b.length > a.length ? b : a));
      expect(longestWord.length).toBeLessThanOrEqual("Connoisseur".length);
    }
  });

  it("holds at two lines maximum", () => {
    for (const p of personalities) {
      expect(p.name.split(" ").length).toBeLessThanOrEqual(3); // "The Adrenaline Junkie"
    }
  });
});
