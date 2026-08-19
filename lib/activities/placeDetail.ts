import type { Activity } from "../../types";

/**
 * Pure helpers for the place detail overlay (OAT-44).
 *
 * Everything here parses live proxy data whose shape was measured in OAT-108,
 * not assumed. The measurements that matter:
 *
 *  - `descriptionLong` is ALWAYS `descriptionShort + ". Located at {address}."`
 *    and carries no independent prose (60/60). It is the only field that holds
 *    a street address, so the address is parsed back out of it rather than
 *    rendered as body copy.
 *  - `descriptionShort` is genuine Google editorial prose in 57/60. The other
 *    3/60 degrade to a rating string ("Transit depot · 4.8★ (34,270 reviews)"),
 *    which reads as leaked data if it is set as a sentence.
 *
 * Kept framework-agnostic and free of react-native imports so it stays testable
 * and so `mapsUrl` can be exercised for every platform from one test run.
 */

/** Trailing "." that the proxy appends after the address. */
const TRAILING_DOT = /\.\s*$/;

/**
 * The street address, recovered from `descriptionLong`.
 *
 * Deliberately anchored on "Located at" rather than on the double-period
 * artifact: the artifact appears in 57/60 because `descriptionShort` already
 * ends in a full stop, but the 3/60 rating-fallback descriptions do not, so a
 * `..` match would silently drop exactly the rows this has to handle.
 *
 * Returns null when the pattern is absent — the caller renders no address
 * rather than a fragment.
 */
export function streetAddress(activity: Activity): string | null {
  const long = activity.descriptionLong;
  if (!long) return null;
  const at = long.lastIndexOf("Located at ");
  if (at === -1) return null;
  const address = long.slice(at + "Located at ".length).replace(TRAILING_DOT, "").trim();
  return address.length > 0 ? address : null;
}

export type PlaceBody =
  | { kind: "prose"; text: string }
  /**
   * The 3/60 case. Google had no editorial summary, so the proxy substituted a
   * type + rating line. Surfaced as structured fields so the screen can set it
   * as a stat rather than as a sentence.
   */
  | { kind: "rating"; placeType: string; rating: string; reviews: string | null };

/** "Transit depot · 4.8★ (34,270 reviews)" — type, rating, optional count. */
const RATING_FALLBACK = /^(.*?)\s*·\s*([\d.]+)\s*★\s*(?:\(([\d,]+)\s*reviews?\))?/;

/**
 * What the body of the overlay should say, and how it should be set.
 *
 * Callers must branch on `kind`: setting a "rating" body as prose is exactly
 * the "looks broken" failure this exists to prevent.
 */
export function placeBody(activity: Activity): PlaceBody | null {
  const short = activity.descriptionShort?.trim();
  if (!short) return null;

  const m = short.match(RATING_FALLBACK);
  if (m) {
    const placeType = m[1].trim();
    return {
      kind: "rating",
      // Never empty: falls back to the activity's own category rather than
      // rendering a bare rating with nothing to attach it to.
      placeType: placeType.length > 0 ? placeType : activity.category,
      rating: m[2],
      reviews: m[3] ?? null
    };
  }
  return { kind: "prose", text: short };
}

/** True when descriptionShort is the rating substitute rather than prose. */
export function isRatingFallback(activity: Activity): boolean {
  return placeBody(activity)?.kind === "rating";
}

/**
 * A maps deep link for this place, built from lat/lng — which OAT-108 measured
 * as populated on 60/60 live activities, unlike `neighborhood`.
 *
 * `platform` is a parameter rather than a Platform.OS read so every branch is
 * reachable from a test.
 */
export function mapsUrl(activity: Activity, platform: string): string {
  const { lat, lng, title } = activity;
  const label = encodeURIComponent(title);
  if (platform === "ios") return `maps://?ll=${lat},${lng}&q=${label}`;
  if (platform === "android") return `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
  // Web and anything else: a plain https link always resolves.
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
