// Explicit globals: TypeScript 6 no longer auto-includes @types/*.
import { describe, expect, it } from "@jest/globals";
import {
  HERO_H,
  SCRIM_BOTTOM_ALPHA,
  SCRIM_BOTTOM_FULL,
  SCRIM_BOTTOM_OPAQUE_FROM,
  SCRIM_BOTTOM_START,
  SCRIM_TOP_CLEAR,
  bottomScrimAlphaAt,
  bottomScrimStops,
  contrastRatio,
  hexToRgb,
  subtitleBand,
  titleBand,
  veiled,
  weakestAlphaOver,
  type Rgb
} from "../lib/activities/heroScrim";
import { color } from "../lib/theme";

/**
 * OAT-44 polish — the hero scrim is held to the contrast it was measured for.
 *
 * The offline model (scripts/oat-44-hero-contrast.py) composites live photos;
 * this suite asserts the analytic worst case the geometry was chosen against —
 * a pure-white photo pixel under each text band — so that anyone who lowers an
 * alpha or slides the ramp back down finds out here rather than on a device.
 */

const WHITE: Rgb = [255, 255, 255];
const BG = hexToRgb(color.bg);
const MUTED = hexToRgb(color.muted);
const TEXT = hexToRgb(color.text);

/** Contrast of `fg` over a pure-white pixel seen through the scrim at `alpha`. */
const overWhite = (fg: Rgb, alpha: number) => contrastRatio(fg, veiled(WHITE, alpha, BG));

describe("the subtitle (color.muted, 12.5px — small text, 4.5:1)", () => {
  it("sits entirely on the opaque zone, so its ratio does not depend on the photo", () => {
    const band = subtitleBand();
    expect(band.top / HERO_H).toBeGreaterThanOrEqual(SCRIM_BOTTOM_OPAQUE_FROM);
    expect(band.bottom).toBeLessThanOrEqual(HERO_H);
    expect(weakestAlphaOver(band)).toBe(1);
  });

  it("clears 4.5:1 over a pure-white pixel", () => {
    const ratio = overWhite(MUTED, weakestAlphaOver(subtitleBand()));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(ratio).toBeCloseTo(6.51, 1); // muted on bg, the ceiling for this text
  });

  it("would NOT have passed at the 0.76 band it inherited from profile.tsx", () => {
    // The regression guard. Before this polish the subtitle already sat in the
    // full-strength band and measured 3.11:1 on Pisco y Nazca — the alpha was
    // the limit, not the ramp position. Muted needs >= 0.88 over white.
    expect(overWhite(MUTED, 0.76)).toBeCloseTo(3.11, 1);
    expect(overWhite(MUTED, 0.76)).toBeLessThan(4.5);
    expect(overWhite(MUTED, 0.88)).toBeGreaterThanOrEqual(4.5);
  });

  it("stays secondary to the title — it is still muted, not white", () => {
    expect(MUTED).toEqual(hexToRgb("#97949E"));
    expect(contrastRatio(TEXT, BG)).toBeGreaterThan(contrastRatio(MUTED, BG));
  });
});

describe("the title (color.text, 26px medium — large text, 3:1)", () => {
  it("keeps one- and two-line titles fully inside the >= 0.76 band", () => {
    expect(weakestAlphaOver(titleBand(1))).toBeGreaterThanOrEqual(SCRIM_BOTTOM_ALPHA);
    expect(weakestAlphaOver(titleBand(2))).toBeGreaterThanOrEqual(SCRIM_BOTTOM_ALPHA);
  });

  it("holds a three-line title's top line at >= 3:1 over pure white", () => {
    // NMAAHC (55 chars) wraps to three lines at 26px on a 390–402pt screen.
    // Under the old 0.45 ramp start its top line sat at alpha 0.15 — 1.97:1
    // on the live photo, 1.23:1 on white. Its top line now sits at alpha
    // 0.597 (the exact ramp value; "0.60" in the module header is rounded),
    // which is 4.46:1 over pure white. Measured on the photo: 7.81:1 at 402pt,
    // 7.60:1 at 390pt. The contract is the 3:1 line, not the alpha.
    const alpha = weakestAlphaOver(titleBand(3));
    expect(alpha).toBeCloseTo(0.597, 3);
    expect(overWhite(TEXT, alpha)).toBeGreaterThanOrEqual(3);
    expect(overWhite(TEXT, alpha)).toBeCloseTo(4.46, 1);
  });

  it("would NOT have held under the old ramp start (the regression guard)", () => {
    const oldAlphaAtThreeLineTop = ((titleBand(3).top / HERO_H - 0.45) / (0.62 - 0.45)) * 0.76;
    expect(oldAlphaAtThreeLineTop).toBeLessThan(0.2);
    expect(overWhite(TEXT, oldAlphaAtThreeLineTop)).toBeLessThan(3);
  });
});

describe("the image", () => {
  it("is never uniformly veiled — the middle is untouched", () => {
    expect(SCRIM_BOTTOM_START).toBeGreaterThan(SCRIM_TOP_CLEAR);
    for (const f of [SCRIM_TOP_CLEAR, 0.3, SCRIM_BOTTOM_START]) expect(bottomScrimAlphaAt(f)).toBe(0);
  });

  it("darkens monotonically from the ramp to the bottom edge", () => {
    let prev = 0;
    for (let f = 0; f <= 1.0001; f += 0.01) {
      const a = bottomScrimAlphaAt(f);
      expect(a).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = a;
    }
    expect(bottomScrimAlphaAt(SCRIM_BOTTOM_FULL)).toBeCloseTo(SCRIM_BOTTOM_ALPHA);
    expect(bottomScrimAlphaAt(1)).toBe(1);
  });
});

describe("gradient stops handed to react-native-svg", () => {
  it("map the hero fractions onto the bottom rect's own span, in order", () => {
    const s = bottomScrimStops();
    const span = 1 - SCRIM_BOTTOM_START;
    expect(s.full).toBeCloseTo((SCRIM_BOTTOM_FULL - SCRIM_BOTTOM_START) / span);
    expect(s.opaque).toBeCloseTo((SCRIM_BOTTOM_OPAQUE_FROM - SCRIM_BOTTOM_START) / span);
    expect(s.full).toBeGreaterThan(0);
    expect(s.full).toBeLessThan(s.opaque);
    expect(s.opaque).toBeLessThan(1);
  });
});
