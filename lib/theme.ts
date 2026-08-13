/**
 * Typed access to the design tokens (OAT-90).
 *
 * The values live in lib/tokens.js — plain CommonJS, because tailwind.config.js
 * has to require the same file and cannot import TypeScript. This module is the
 * typed face of it for app code, plus the accent-alpha helper.
 *
 * Prefer NativeWind classes (`bg-surface`, `border-line`, `text-muted`,
 * `rounded-card`) wherever a className works. Reach for these constants only
 * where a style object is unavoidable — e.g. the tab bar's screenOptions.
 */
import tokens from "./tokens";

export const color = tokens.color;
export const radius = tokens.radius;
export const screen = tokens.screen;
export const font = tokens.font;
export const tabBar = tokens.tabBar;

export type ColorToken = keyof typeof tokens.color;
export type RadiusToken = keyof typeof tokens.radius;

/** The alpha suffixes this system uses on accent hexes. */
export const ALPHA = tokens.alpha;
export type AlphaToken = keyof typeof tokens.alpha;

/**
 * Append one of the system's alpha suffixes to a 6-digit accent hex.
 *
 *   withAlpha(accent, "glow")   -> "#22D3EE26"   reveal radial glow
 *   withAlpha(accent, "barMuted") -> "#22D3EE66" non-dominant spectrum bar
 *
 * React Native accepts #RRGGBBAA, so this is a plain concatenation — the point
 * is that the suffixes are named and spelled in exactly one place rather than
 * scattered as string literals across screens.
 */
export function withAlpha(hex: string, token: AlphaToken): string {
  return `${hex}${ALPHA[token]}`;
}
