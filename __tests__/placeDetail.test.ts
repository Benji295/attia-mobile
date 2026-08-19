// Explicit globals: TypeScript 6 no longer auto-includes @types/*.
import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { activities as seedActivities } from "../data/activities";
import { isRatingFallback, mapsUrl, placeBody, streetAddress } from "../lib/activities/placeDetail";
import type { Activity } from "../types";

/**
 * OAT-44 — the place detail parsers, exercised against the REAL proxy payload.
 *
 * These run over scripts/data/live-activities.json (the 60 activities captured
 * in OAT-108), not hand-written fixtures. The whole point of these helpers is
 * that they survive the shape live data actually has — inventing inputs would
 * test the parser against my own assumptions instead of Google's output.
 */

const FIXTURE = join(__dirname, "..", "scripts", "data", "live-activities.json");
const capture = JSON.parse(readFileSync(FIXTURE, "utf8")) as {
  cities: Record<string, { activities: Activity[] }>;
};
const live: Activity[] = Object.values(capture.cities).flatMap((c) => c.activities);

describe("the live payload this screen is designed against", () => {
  it("is the 60 activities OAT-108 captured", () => {
    expect(live).toHaveLength(60);
  });
});

describe("streetAddress", () => {
  it("recovers an address for every live activity", () => {
    const missing = live.filter((a) => streetAddress(a) === null);
    expect(missing).toEqual([]);
  });

  it("strips the trailing period the proxy appends", () => {
    for (const a of live) expect(streetAddress(a)).not.toMatch(/\.$/);
  });

  it("never leaks the description into the address", () => {
    for (const a of live) {
      expect(streetAddress(a)).not.toContain("Located at");
      // The address must be strictly shorter than the description it came from.
      expect(streetAddress(a)!.length).toBeLessThan(a.descriptionLong.length);
    }
  });

  it("handles the 3/60 whose description has no trailing period", () => {
    // These are the rating-fallback rows: "…(34,270 reviews). Located at …"
    // rather than the "…since 1888.. Located at …" double-period form. Anchoring
    // on ".." instead of "Located at" would silently drop exactly these.
    const singleDot = live.filter((a) => !a.descriptionLong.includes(".. Located at"));
    expect(singleDot.length).toBeGreaterThan(0);
    for (const a of singleDot) expect(streetAddress(a)).toBeTruthy();
  });

  it("returns null rather than a fragment when the pattern is absent", () => {
    const a = { ...live[0], descriptionLong: "Just a description with no marker" };
    expect(streetAddress(a)).toBeNull();
    expect(streetAddress({ ...live[0], descriptionLong: "" })).toBeNull();
    // Present but empty after the marker.
    expect(streetAddress({ ...live[0], descriptionLong: "Thing. Located at ." })).toBeNull();
  });

  it("works on the seed data too, which has no address at all", () => {
    for (const a of seedActivities) expect(streetAddress(a)).toBeNull();
  });
});

describe("placeBody — prose vs the 3/60 rating fallback", () => {
  it("splits the live set into 57 prose and 3 rating", () => {
    const prose = live.filter((a) => placeBody(a)?.kind === "prose");
    const rating = live.filter((a) => placeBody(a)?.kind === "rating");
    expect(prose).toHaveLength(57);
    expect(rating).toHaveLength(3);
  });

  it("parses the rating rows into fields, never leaving them as a sentence", () => {
    const rating = live.filter(isRatingFallback);
    for (const a of rating) {
      const body = placeBody(a);
      expect(body).not.toBeNull();
      if (body?.kind !== "rating") throw new Error("expected a rating body");
      expect(body.placeType.length).toBeGreaterThan(0);
      expect(Number(body.rating)).toBeGreaterThan(0);
      expect(Number(body.rating)).toBeLessThanOrEqual(5);
      // The star and the raw parenthetical must not survive into any field.
      expect(body.placeType).not.toContain("★");
      expect(body.placeType).not.toContain("(");
    }
  });

  it("reads a known rating row exactly", () => {
    const a = {
      ...live[0],
      descriptionShort: "Transit depot · 4.8★ (34,270 reviews)"
    };
    expect(placeBody(a)).toEqual({
      kind: "rating",
      placeType: "Transit depot",
      rating: "4.8",
      reviews: "34,270"
    });
  });

  it("survives a rating with no review count", () => {
    const a = { ...live[0], descriptionShort: "Church · 4.9★" };
    expect(placeBody(a)).toEqual({
      kind: "rating",
      placeType: "Church",
      rating: "4.9",
      reviews: null
    });
  });

  it("falls back to the category when the type is missing", () => {
    const a = { ...live[0], category: "Museum", descriptionShort: " · 4.2★ (10 reviews)" };
    const body = placeBody(a);
    if (body?.kind !== "rating") throw new Error("expected a rating body");
    expect(body.placeType).toBe("Museum");
  });

  it("keeps real editorial prose intact, including prose containing a middot", () => {
    const a = { ...live[0], descriptionShort: "Deli · counter service since 1888." };
    // No star, so this is prose, not a rating line.
    expect(placeBody(a)).toEqual({
      kind: "prose",
      text: "Deli · counter service since 1888."
    });
  });

  it("returns null for an empty description rather than an empty paragraph", () => {
    expect(placeBody({ ...live[0], descriptionShort: "" })).toBeNull();
    expect(placeBody({ ...live[0], descriptionShort: "   " })).toBeNull();
  });
});

describe("mapsUrl", () => {
  const a = { ...live[0], lat: 38.8951, lng: -77.0364, title: "National Mall" };

  it("uses the native maps scheme per platform", () => {
    expect(mapsUrl(a, "ios")).toBe("maps://?ll=38.8951,-77.0364&q=National%20Mall");
    expect(mapsUrl(a, "android")).toBe(
      "geo:38.8951,-77.0364?q=38.8951,-77.0364(National%20Mall)"
    );
  });

  it("falls back to an https link on web, which always resolves", () => {
    expect(mapsUrl(a, "web")).toBe(
      "https://www.google.com/maps/search/?api=1&query=38.8951,-77.0364"
    );
    expect(mapsUrl(a, "windows")).toContain("https://");
  });

  it("escapes titles that would otherwise break the URL", () => {
    const tricky = { ...a, title: "Ben & Jerry's #1" };
    expect(mapsUrl(tricky, "ios")).toContain("Ben%20%26%20Jerry's%20%231");
    expect(mapsUrl(tricky, "ios")).not.toContain(" ");
  });

  it("carries real coordinates for every live activity", () => {
    for (const x of live) {
      expect(mapsUrl(x, "web")).toContain(`${x.lat},${x.lng}`);
      expect(Number.isFinite(x.lat)).toBe(true);
      expect(Number.isFinite(x.lng)).toBe(true);
    }
  });
});
