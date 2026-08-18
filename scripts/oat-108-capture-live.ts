/**
 * OAT-108 — capture real scored activities from the live Places proxy.
 *
 * These are BILLABLE calls. Run this once; the result is committed as a
 * fixture at scripts/data/live-activities.json so every number in the
 * analysis can be re-checked offline. Re-run only to refresh the capture.
 *
 * Run:  npx tsx scripts/oat-108-capture-live.ts
 *
 * Uses lib/places/fetchActivities.getActivities — the same function the app
 * calls — rather than reimplementing the request, so what lands in the fixture
 * is exactly what a user's device would receive.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cities } from "../data/cities";
import type { Activity } from "../types";

// lib/config.ts reads __DEV__, a React Native global that does not exist in
// Node. Defining it before the dynamic import below leaves the request path
// untouched: ATTIA_API_BASE is read from env/default and does not depend on it.
(globalThis as { __DEV__?: boolean }).__DEV__ = false;

const OUT = join(dirname(fileURLToPath(import.meta.url)), "data", "live-activities.json");

export type Capture = {
  capturedAt: string;
  apiBase: string;
  note: string;
  cities: Record<string, { count: number; repeatIdentical: boolean; activities: Activity[] }>;
};

async function main() {
  const { getActivities } = await import("../lib/places/fetchActivities");
  const { ATTIA_API_BASE } = await import("../lib/config");

  const out: Capture = {
    capturedAt: new Date().toISOString(),
    apiBase: ATTIA_API_BASE,
    note:
      "Captured via lib/places/fetchActivities.getActivities — the app's own code path. " +
      "repeatIdentical records whether an immediate second request returned the same " +
      "activity ids in the same order, which is how a cached or deterministic proxy " +
      "response shows up.",
    cities: {}
  };

  for (const city of cities) {
    process.stdout.write(`fetching ${city.id} ... `);
    const first = await getActivities(city.id);
    // A second call, to see whether the proxy is serving cached/deterministic
    // results. Reported rather than acted on.
    const second = await getActivities(city.id);
    const same =
      first.length === second.length && first.every((a, i) => a.id === second[i].id);
    out.cities[city.id] = { count: first.length, repeatIdentical: same, activities: first };
    console.log(`${first.length} activities (repeat identical: ${same})`);
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`\nwrote ${OUT}`);
  console.log(`capturedAt ${out.capturedAt}`);
}

main().catch((e) => {
  console.error("CAPTURE FAILED:", (e as Error).message);
  console.error("Per the brief: stopping rather than falling back to seed data.");
  process.exit(2);
});
