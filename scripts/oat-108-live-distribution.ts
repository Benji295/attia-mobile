/**
 * OAT-108 — does the live activity data behave like the seed data?
 *
 * MEASUREMENT ONLY. Reads the committed fixture written by
 * scripts/oat-108-capture-live.ts; makes no network calls itself, so any
 * number here can be re-checked without spending API credit.
 *
 * Run:  npx tsx scripts/oat-108-live-distribution.ts
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { activities as seedActivities } from "../data/activities";
import { cities } from "../data/cities";
import type { Activity } from "../types";
import {
  CURRENT,
  IDS,
  alignmentsFor,
  med,
  poolOf,
  purePath,
  mulberry32,
  sampleUsers,
  show,
  verifyMirror
} from "./lib/matchModel";

type Capture = {
  capturedAt: string;
  apiBase: string;
  cities: Record<string, { count: number; repeatIdentical: boolean; activities: Activity[] }>;
};

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "data", "live-activities.json");
const cap: Capture = JSON.parse(readFileSync(FIXTURE, "utf8"));

const LIST = 10;
const N = 20000;

const pad = (s: string | number, w: number) => String(s).padStart(w);

console.log("OAT-108 — live activity distribution vs the seed model");
console.log("=".repeat(78));
console.log(`\nFixture : ${FIXTURE.split("/").slice(-3).join("/")}`);
console.log(`Captured: ${cap.capturedAt}   from ${cap.apiBase}`);

// ---------------------------------------------------------------------------
console.log("\n0. Mirror verification against the shipped activityMatchPercentage");
for (const [cityId, c] of Object.entries(cap.cities)) {
  const n = verifyMirror(c.activities, 300);
  console.log(`   ${pad(cityId, 14)}  ${pad(n.toLocaleString(), 7)} checks — exact match`);
}

// ---------------------------------------------------------------------------
console.log("\n\n1. POOL COMPOSITION (section E — what the numbers rest on)");
console.log("   city            pool  distinct scores  most common values");
const allScores: number[] = [];
for (const [cityId, c] of Object.entries(cap.cities)) {
  const vals = c.activities.flatMap((a) => IDS.map((id) => a.personalityScores[id]));
  allScores.push(...vals);
  const freq = new Map<number, number>();
  for (const v of vals) freq.set(v, (freq.get(v) ?? 0) + 1);
  const top = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([v, n]) => `${v} (${((100 * n) / vals.length).toFixed(0)}%)`)
    .join("  ");
  console.log(`   ${pad(cityId, 14)}  ${pad(c.count, 4)}  ${pad(new Set(vals).size, 15)}  ${top}`);
}
{
  const freq = new Map<number, number>();
  for (const v of allScores) freq.set(v, (freq.get(v) ?? 0) + 1);
  const twenty = ((100 * (freq.get(20) ?? 0)) / allScores.length).toFixed(1);
  console.log(
    `\n   Across all three cities: ${new Set(allScores).size} distinct values, ` +
      `but ${twenty}% of every score is exactly 20.`
  );
  console.log(
    "   A single value dominating that heavily reads as a default for traits the"
  );
  console.log(
    "   scorer had no opinion about — the pattern CLAUDE.md flags as a prior bug."
  );
  console.log("   Reported, not acted on.");
}

// ---------------------------------------------------------------------------
// B. Named lists: one per city x archetype, for the pure-path answerer.
// ---------------------------------------------------------------------------
console.log("\n\n2. B — EVERY CITY x ARCHETYPE LIST (pure-path answerer, current constants)");
console.log(`   ${fmtC()}`);
console.log(
  "\n   city / archetype              distinct  1->2   1->10   top-10 badges under current constants"
);
console.log(
  "                                 in pool  align  align"
);

type NamedRow = {
  city: string;
  arch: string;
  distinctPool: number;
  g2: number;
  g10: number;
  badges: number[];
};
const named: NamedRow[] = [];

for (const city of cities) {
  const entry = cap.cities[city.id];
  if (!entry) continue;
  const pool = poolOf(entry.activities);
  for (let t = 0; t < IDS.length; t++) {
    const raw = purePath(t);
    const al = alignmentsFor(raw, pool).sort((a, b) => b - a);
    const topAl = al.slice(0, LIST);
    const badges = topAl.map((v) => show(v, CURRENT));
    const distinctPool = new Set(entry.activities.map((a) => a.personalityScores[IDS[t]])).size;
    named.push({
      city: city.id,
      arch: IDS[t],
      distinctPool,
      g2: topAl[0] - topAl[1],
      g10: topAl[0] - topAl[topAl.length - 1],
      badges
    });
    console.log(
      `   ${pad(city.id, 13)} ${pad(IDS[t], 17)} ${pad(distinctPool, 6)}  ` +
        `${pad((topAl[0] - topAl[1]).toFixed(2), 5)}  ${pad((topAl[0] - topAl[topAl.length - 1]).toFixed(2), 5)}   ` +
        badges.map((b) => pad(b, 2)).join(" ")
    );
  }
}

// The specific case that prompted this ticket.
console.log("\n   The two lists cited in the brief:");
for (const [city, arch] of [
  ["miami", "connoisseur"],
  ["miami", "socialite"]
] as const) {
  const r = named.find((x) => x.city === city && x.arch === arch);
  if (r) {
    console.log(
      `     ${pad(city, 7)} ${pad(arch, 12)} -> ${r.badges.slice(0, 3).join(" / ")}` +
        `   (full: ${r.badges.join(" ")})`
    );
  }
}

{
  const g2s = named.map((r) => r.g2);
  const g10s = named.map((r) => r.g10);
  const top3same = named.filter((r) => r.badges[0] === r.badges[1] && r.badges[1] === r.badges[2]);
  const distinctBadges = named.map((r) => new Set(r.badges).size);
  console.log(`\n   Across all ${named.length} named lists:`);
  console.log(
    `     median 1->2 alignment gap  ${med(g2s).toFixed(2)}   ` +
      `median 1->10 gap ${med(g10s).toFixed(2)}   ratio ${
        med(g2s) === 0
          ? "UNDEFINED — the median 1->2 gap is exactly 0"
          : `${(med(g10s) / med(g2s)).toFixed(1)}:1`
      }`
  );
  console.log(
    `     lists where 1st and 2nd are an EXACT tie   ${g2s.filter((v) => v === 0).length}/${named.length}`
  );
  console.log(
    `     median distinct badges in a 10-place list  ${med(distinctBadges)}/10`
  );
  console.log(
    `     lists whose top 3 badges read the same     ${top3same.length}/${named.length} ` +
      `(${((100 * top3same.length) / named.length).toFixed(1)}%)` +
      (top3same.length ? `  [${top3same.map((r) => `${r.city}/${r.arch}`).join(", ")}]` : "")
  );
}

// ---------------------------------------------------------------------------
// B aggregate + D. Monte Carlo across the live pools.
// ---------------------------------------------------------------------------
console.log("\n\n3. B/D AGGREGATE — Monte Carlo over the live pools");
console.log(`   ${N.toLocaleString()} simulated users per city per model.\n`);
console.log(
  "   city           model       med   1->2   1->5   1->10  ratio  distinct  top3=  top5span<=1"
);

type Agg = { label: string; g2: number; g5: number; g10: number; ratio: number };
const aggRows: Agg[] = [];

for (const city of cities) {
  const entry = cap.cities[city.id];
  if (!entry) continue;
  const pool = poolOf(entry.activities);
  for (const [label, noise] of [
    ["consistent", 0.15],
    ["moderate  ", 0.3]
  ] as const) {
    const users = sampleUsers(N, 7000 + city.id.length, noise);
    const g2: number[] = [];
    const g5: number[] = [];
    const g10: number[] = [];
    const distinct: number[] = [];
    const tops: number[] = [];
    let top3same = 0;
    let unstable = 0;
    for (const raw of users) {
      const al = alignmentsFor(raw, pool).sort((a, b) => b - a).slice(0, LIST);
      const b = al.map((v) => show(v, CURRENT));
      g2.push(al[0] - al[1]);
      g5.push(al[0] - al[4]);
      g10.push(al[0] - al[LIST - 1]);
      distinct.push(new Set(b).size);
      tops.push(b[0]);
      if (b[0] === b[1] && b[1] === b[2]) top3same++;
      // D: the top five separated by one alignment point or less.
      if (al[0] - al[4] <= 1) unstable++;
    }
    const ratio = med(g10) / med(g2);
    aggRows.push({ label: `${city.id}/${label.trim()}`, g2: med(g2), g5: med(g5), g10: med(g10), ratio });
    console.log(
      `   ${pad(city.id, 13)}  ${label}  ${pad(med(tops), 4)}  ` +
        `${pad(med(g2).toFixed(2), 5)}  ${pad(med(g5).toFixed(2), 5)}  ${pad(med(g10).toFixed(2), 5)}  ` +
        `${pad(ratio.toFixed(1), 5)}  ${pad(med(distinct), 5)}/10  ` +
        `${pad(((100 * top3same) / N).toFixed(1) + "%", 6)}  ${pad(((100 * unstable) / N).toFixed(1) + "%", 6)}`
    );
  }
}

// ---------------------------------------------------------------------------
// C. Live vs seed, measured identically.
// ---------------------------------------------------------------------------
console.log("\n\n4. C — LIVE vs SEED: the 22:1 structural claim");
console.log("   Same model (consistent, noise 0.15), same code, different pools.\n");
console.log("   pool                          n   1->2   1->10   ratio   verdict");

function ratioFor(pool: number[][], seedNum: number): { g2: number; g10: number; ratio: number } {
  const users = sampleUsers(N, seedNum, 0.15);
  const g2: number[] = [];
  const g10: number[] = [];
  for (const raw of users) {
    const al = alignmentsFor(raw, pool).sort((a, b) => b - a).slice(0, LIST);
    g2.push(al[0] - al[1]);
    g10.push(al[0] - al[LIST - 1]);
  }
  return { g2: med(g2), g10: med(g10), ratio: med(g10) / med(g2) };
}

/**
 * The ratio scales with pool size — a longer pool pushes the 10th result
 * further down without changing the 1->2 gap — so the comparison is only
 * meaningful between pools of the SAME size. PR #29's 22:1 was measured on a
 * 60-place permuted seed pool; the size-matched row is the one that decides
 * the question.
 */
function permutedSeed(size: number, seedNum: number): number[][] {
  const rand = mulberry32(seedNum);
  const out: number[][] = [];
  for (let k = 0; k < size; k++) {
    const base = poolOf(seedActivities)[k % seedActivities.length];
    const perm = IDS.map((_, i) => i);
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    out.push(perm.map((p) => base[p]));
  }
  return out;
}

const refs: { label: string; pool: number[][] }[] = [
  { label: "seed raw (data/activities)", pool: poolOf(seedActivities) },
  { label: "seed permuted -> 20 [MATCHED]", pool: permutedSeed(20, 4242) },
  { label: "seed permuted -> 60 (PR #29)", pool: permutedSeed(60, 4242) }
];
let matched = 0;
for (const r of refs) {
  const m = ratioFor(r.pool, 991);
  if (r.label.includes("MATCHED")) matched = m.ratio;
  console.log(
    `   ${pad(r.label, 30)} ${pad(r.pool.length, 3)}  ` +
      `${pad(m.g2.toFixed(2), 5)}  ${pad(m.g10.toFixed(2), 5)}   ${pad(m.ratio.toFixed(1) + ":1", 6)}  reference`
  );
}
console.log();
for (const city of cities) {
  const entry = cap.cities[city.id];
  if (!entry) continue;
  const r = ratioFor(poolOf(entry.activities), 991);
  const verdict =
    r.ratio < matched * 0.75 ? "BETTER than seed" : r.ratio > matched * 1.25 ? "WORSE than seed" : "same as seed";
  console.log(
    `   ${pad(`live ${city.id}`, 30)} ${pad(entry.count, 3)}  ` +
      `${pad(r.g2.toFixed(2), 5)}  ${pad(r.g10.toFixed(2), 5)}   ${pad(r.ratio.toFixed(1) + ":1", 6)}  ${verdict}`
  );
}
console.log(
  `\n   Compared against the size-matched 20-place seed pool (${matched.toFixed(1)}:1).`
);

// ---------------------------------------------------------------------------
console.log("\n\n5. D — ORDERING STABILITY (bears on OAT-44)");
console.log("   A list whose top five sit within one alignment point could have been");
console.log("   sorted in any order; bespoke reasoning about 'why this one is first'");
console.log("   is not defensible for those users.\n");
console.log("   city           model       top5 within 1.0   top5 within 0.5   top3 within 0.5");
for (const city of cities) {
  const entry = cap.cities[city.id];
  if (!entry) continue;
  const pool = poolOf(entry.activities);
  for (const [label, noise] of [
    ["consistent", 0.15],
    ["moderate  ", 0.3]
  ] as const) {
    const users = sampleUsers(N, 7000 + city.id.length, noise);
    let a1 = 0;
    let a05 = 0;
    let t05 = 0;
    for (const raw of users) {
      const al = alignmentsFor(raw, pool).sort((a, b) => b - a);
      if (al[0] - al[4] <= 1) a1++;
      if (al[0] - al[4] <= 0.5) a05++;
      if (al[0] - al[2] <= 0.5) t05++;
    }
    console.log(
      `   ${pad(city.id, 13)}  ${label}  ${pad(((100 * a1) / N).toFixed(1) + "%", 14)}   ` +
        `${pad(((100 * a05) / N).toFixed(1) + "%", 14)}   ${pad(((100 * t05) / N).toFixed(1) + "%", 13)}`
    );
  }
}

// ---------------------------------------------------------------------------
console.log("\n\n6. E — WHAT MAKES THIS UNRELIABLE");
const sizes = Object.values(cap.cities).map((c) => c.count);
console.log(
  `   * Pool size is ${sizes.join("/")} per city. A 10-place list is HALF the pool,`
);
console.log(
  "     so the 10th result is near the bottom of what exists. The 1->10 span is"
);
console.log("     therefore inflated relative to a production catalogue of hundreds.");
const repeats = Object.entries(cap.cities).filter(([, c]) => c.repeatIdentical).map(([k]) => k);
console.log(
  `   * An immediate repeat request returned identical ids for: ${repeats.join(", ")}.`
);
console.log(
  "     Consistent with a cached or deterministic proxy. One capture, one moment —"
);
console.log("     these numbers do not show how the catalogue varies over time.");
// Archetype coverage: does every archetype have a genuinely strong activity?
console.log("   * Archetype coverage (activities scoring >= 80 for that archetype):");
for (const city of cities) {
  const entry = cap.cities[city.id];
  if (!entry) continue;
  const thin = IDS.map((id) => ({
    id,
    n: entry.activities.filter((a) => a.personalityScores[id] >= 80).length
  })).filter((x) => x.n <= 1);
  console.log(
    `     ${pad(city.id, 14)} ${
      thin.length === 0
        ? "every archetype has 2+ strong activities"
        : `THIN: ${thin.map((x) => `${x.id} (${x.n})`).join(", ")}`
    }`
  );
}
console.log(
  "   * The badge is computed from personalityScores alone. Those are assigned"
);
console.log(
  "     server-side by the proxy; this measures their output, not how they are derived."
);

function fmtC() {
  return `PIVOT ${CURRENT.pivot} · CONTRAST ${CURRENT.contrast} · FLOOR ${CURRENT.floor} · CEIL ${CURRENT.ceil}`;
}
