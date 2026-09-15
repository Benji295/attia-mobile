import { screen } from "../theme";

/**
 * Hero geometry for the place detail overlay (OAT-44 polish).
 *
 * The numbers the component draws with live here, framework-free, so the
 * legibility they were tuned for can be asserted in a test instead of trusted.
 *
 * Every value is measured, not chosen — the offline model in
 * scripts/oat-44-hero-contrast.py composites live fixture photos exactly as
 * the overlay lays them out and reads the brightest pixel under each glyph.
 * What it found, and what this geometry answers:
 *
 *  - The subtitle (color.muted, 12.5px) already sat inside the 0.76 band that
 *    profile.tsx's hero uses, and still failed: 0.76 over a near-white pixel
 *    composites to rgb(71,71,73), which is 3.11:1 against muted. Small text
 *    needs 4.5:1. Moving the ramp does nothing for it — the band's ALPHA is
 *    the limit. Muted text cannot pass over any photo until the scrim reaches
 *    >= 0.88; so under the subtitle band it goes to 1.0, i.e. the photo
 *    dissolves into the sheet background, which is what the design README's
 *    own gradient for this screen does ("#0D0D0F 100%").
 *  - A three-line title (NMAAHC, 55 chars) put its top line in the ramp at
 *    alpha 0.15 — 1.97:1. That one IS fixed by starting the ramp higher:
 *    0.35 puts the top line of a three-line title at 0.597 (4.46:1 over pure
 *    white; 7.81:1 on the NMAAHC photo at 402pt), clear of the 3:1 large-text
 *    line, while leaving the middle of the image untouched from 25% to 35% of
 *    its height.
 *
 * The image is never uniformly veiled. The scrim has three zones from the top
 * of the ramp down: transparent -> 0.76 (title lines) -> 1.0 (subtitle).
 */
export const HERO_H = 260;
/** Text block padding — screen.x, the same inset the sheet body uses. */
export const HERO_PAD = screen.x;

export const TITLE_SIZE = 26;
export const TITLE_LINE_HEIGHT = TITLE_SIZE * 1.18;
export const SUBTITLE_SIZE = 12.5;
/** Explicit, so the subtitle band is the same height on every platform. */
export const SUBTITLE_LINE_HEIGHT = SUBTITLE_SIZE * 1.3;
/** mt-1 between title and subtitle. */
export const SUBTITLE_GAP = 4;

/** Top scrim: sits under the close button only. Unchanged from profile.tsx. */
export const SCRIM_TOP_ALPHA = 0.38;
export const SCRIM_TOP_CLEAR = 0.25;

/** Bottom scrim, as fractions of HERO_H. */
export const SCRIM_BOTTOM_START = 0.35; // transparent here; ramp begins
export const SCRIM_BOTTOM_FULL = 0.52; // 0.76 from here — the title band
export const SCRIM_BOTTOM_ALPHA = 0.76;
export const SCRIM_BOTTOM_OPAQUE_FROM = 0.84; // 1.0 from here — the subtitle band

export type Rgb = readonly [number, number, number];

/** Alpha of the bottom scrim at a fraction of the hero height (0 = top). */
export function bottomScrimAlphaAt(yFraction: number): number {
  const stops: readonly (readonly [number, number])[] = [
    [SCRIM_BOTTOM_START, 0],
    [SCRIM_BOTTOM_FULL, SCRIM_BOTTOM_ALPHA],
    [SCRIM_BOTTOM_OPAQUE_FROM, 1],
    [1, 1]
  ];
  if (yFraction <= stops[0][0]) return 0;
  for (let i = 1; i < stops.length; i++) {
    const [f0, a0] = stops[i - 1];
    const [f1, a1] = stops[i];
    if (yFraction <= f1) return a0 + ((a1 - a0) * (yFraction - f0)) / (f1 - f0);
  }
  return 1;
}

/**
 * Gradient stop offsets for the bottom scrim's <Rect>, which spans from
 * SCRIM_BOTTOM_START to the bottom edge — so offsets are relative to that
 * span, not to the hero.
 */
export function bottomScrimStops(): { full: number; opaque: number } {
  const span = 1 - SCRIM_BOTTOM_START;
  return {
    full: (SCRIM_BOTTOM_FULL - SCRIM_BOTTOM_START) / span,
    opaque: (SCRIM_BOTTOM_OPAQUE_FROM - SCRIM_BOTTOM_START) / span
  };
}

/** Line box of the subtitle, in pt from the hero's top edge. */
export function subtitleBand(): { top: number; bottom: number } {
  const bottom = HERO_H - HERO_PAD;
  return { top: bottom - SUBTITLE_LINE_HEIGHT, bottom };
}

/** Line boxes of an n-line title, in pt from the hero's top edge. */
export function titleBand(lines: number): { top: number; bottom: number } {
  const bottom = subtitleBand().top - SUBTITLE_GAP;
  return { top: bottom - lines * TITLE_LINE_HEIGHT, bottom };
}

/** The scrim's alpha at the TOP of a band — its least-covered pixel row. */
export function weakestAlphaOver(band: { top: number; bottom: number }): number {
  return bottomScrimAlphaAt(band.top / HERO_H);
}

// --- WCAG contrast, for the test that keeps the numbers above honest --------

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** A photo pixel seen through the scrim: `over` at `alpha` on top of it. */
export function veiled(pixel: Rgb, alpha: number, over: Rgb): Rgb {
  return [
    Math.round(pixel[0] * (1 - alpha) + over[0] * alpha),
    Math.round(pixel[1] * (1 - alpha) + over[1] * alpha),
    Math.round(pixel[2] * (1 - alpha) + over[2] * alpha)
  ];
}
