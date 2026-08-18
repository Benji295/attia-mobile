/**
 * OAT-108 — sweep the match-percentage constants. MEASUREMENT ONLY.
 *
 * Nothing here changes scoring. The constants in lib/scoring/recommendations.ts
 * are private to that module, so they are mirrored below as CURRENT and then
 * cross-checked against the shipped activityMatchPercentage — if the mirror
 * ever stops reproducing the real function the script aborts.
 *
 * Run:  npx tsx scripts/oat-108-percentage-sweep.ts
 *
 * The answerer models are deliberately duplicated from
 * scripts/oat-107-tie-measurement.ts rather than extracted into a shared
 * module, so that OAT-107's published numbers keep reproducing byte-for-byte
 * from the file that produced them.
 */
import { activities } from "../data/activities";
import { quizQuestions } from "../data/quiz";
import { activityMatchPercentage } from "../lib/scoring/recommendations";
import { personalityIds, type PersonalityWeights } from "../types";

const IDS = [...personalityIds];
const DIM = IDS.length;

/** Mirrored from lib/scoring/recommendations.ts (module-private there). */
type Constants = { pivot: number; contrast: number; floor: number; ceil: number };
const CURRENT: Constants = { pivot: 50, contrast: 1.35, floor: 38, ceil: 99 };

const MATRIX: number[][][] = quizQuestions.map((q) =>
  q.options.map((o) => IDS.map((id) => (o.weights as Partial<PersonalityWeights>)[id] ?? 0))
);
/** The 10 seed activities, as raw personality-score vectors. */
const ACT: number[][] = activities.map((a) => IDS.map((id) => a.personalityScores[id]));

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Answerer models — identical to OAT-107's.
// ---------------------------------------------------------------------------
const BEST: number[][] = MATRIX.map((opts) =>
  IDS.map((_, i) => {
    let bi = 0;
    for (let o = 1; o < opts.length; o++) if (opts[o][i] > opts[bi][i]) bi = o;
    return bi;
  })
);

function scoreOf(choice: number[]): number[] {
  const s = new Array<number>(DIM).fill(0);
  for (let q = 0; q < choice.length; q++) {
    const w = MATRIX[q][choice[q]];
    for (let i = 0; i < DIM; i++) s[i] += w[i];
  }
  return s;
}

/** noise === null => uniform over the answer space. */
function sampleUsers(n: number, seed: number, noise: number | null): number[][] {
  const rand = mulberry32(seed);
  const out: number[][] = [];
  const choice = new Array<number>(quizQuestions.length);
  for (let k = 0; k < n; k++) {
    if (noise === null) {
      for (let q = 0; q < choice.length; q++) choice[q] = Math.floor(rand() * 8);
    } else {
      const target = Math.floor(rand() * DIM);
      for (let q = 0; q < choice.length; q++) {
        choice[q] = rand() < noise ? Math.floor(rand() * 8) : BEST[q][target];
      }
    }
    out.push(scoreOf(choice));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Alignment — the constant-INDEPENDENT part of the pipeline. This is the whole
// point of the script: alignment is fixed by the quiz weights and the activity
// data, and no choice of constants can widen it. The constants only decide how
// that fixed spread is projected onto the 0–100 badge.
// ---------------------------------------------------------------------------
function alignmentsFor(raw: number[], pool: number[][]): number[] {
  const total = raw.reduce((a, b) => a + b, 0) || 1;
  const norm = raw.map((v) => v / total);
  return pool.map((act) => {
    let s = 0;
    for (let i = 0; i < DIM; i++) s += norm[i] * act[i];
    return s;
  });
}

/** The shipped transform, parameterised. Strictly monotonic in `alignment`. */
function show(alignment: number, c: Constants): number {
  return Math.max(c.floor, Math.min(c.ceil, Math.round(c.pivot + (alignment - c.pivot) * c.contrast)));
}

// ---------------------------------------------------------------------------
// Cross-check the mirror against the code that actually ships.
// ---------------------------------------------------------------------------
function verifyMirror(trials = 3000): void {
  const users = sampleUsers(trials, 20250108, 0.3);
  for (const raw of users) {
    const weights = Object.fromEntries(IDS.map((id, i) => [id, raw[i]])) as PersonalityWeights;
    const align = alignmentsFor(raw, ACT);
    for (let a = 0; a < activities.length; a++) {
      const mine = show(align[a], CURRENT);
      const real = activityMatchPercentage(activities[a], weights);
      if (mine !== real) {
        console.error(
          `ABORT: mirror disagrees with activityMatchPercentage (${mine} vs ${real}) ` +
            `on activity ${activities[a].id}`
        );
        process.exit(1);
      }
    }
  }
  console.log(
    `  ${trials.toLocaleString()} x ${activities.length} cross-checks against the shipped\n` +
      `  activityMatchPercentage: exact match. The sweep below describes the real transform.`
  );
}

// ---------------------------------------------------------------------------
// Activity pools.
// ---------------------------------------------------------------------------
/**
 * A wider pool built by permuting WHICH archetype owns each score in a real
 * seed vector. The multiset of numbers is exactly the shipped data's; only the
 * owner changes. This models "a city with more places of the same character",
 * which is what production looks like — a 10-place list drawn from a 10-place
 * pool is degenerate, because the 10th result is also the worst possible one.
 */
function widePool(size: number, seed: number): number[][] {
  const rand = mulberry32(seed);
  const pool: number[][] = [];
  for (let k = 0; k < size; k++) {
    const base = ACT[k % ACT.length];
    const perm = IDS.map((_, i) => i);
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    pool.push(perm.map((p) => base[p]));
  }
  return pool;
}

const LIST = 10; // places a user actually sees

/**
 * Per user, the alignments of their top LIST activities, sorted descending.
 * Sorting once is safe for the entire sweep: the transform is monotonic in
 * alignment, so no choice of constants can reorder a list — constants change
 * the numbers on the badges, never which places are shown or in what order.
 */
function topAlignments(users: number[][], pool: number[][]): number[][] {
  return users.map((raw) => {
    const al = alignmentsFor(raw, pool);
    al.sort((a, b) => b - a);
    return al.slice(0, LIST);
  });
}

// ---------------------------------------------------------------------------
// Metrics.
// ---------------------------------------------------------------------------
const quant = (sorted: number[], f: number) => sorted[Math.floor(f * (sorted.length - 1))];
const med = (xs: number[]) => quant([...xs].sort((a, b) => a - b), 0.5);

type Metrics = {
  medTop: number;
  p10Top: number;
  p90Top: number;
  medGap: number;
  medDistinct: number;
  ceilPct: number;
  floorPct: number;
  /** Share of users whose top 3 badges all read the same number. */
  top3SamePct: number;
};

function metricsFor(tops: number[][], c: Constants): Metrics {
  const t: number[] = [];
  const gaps: number[] = [];
  const distinct: number[] = [];
  let atCeil = 0;
  let atFloor = 0;
  let cells = 0;
  let top3Same = 0;
  for (const row of tops) {
    const d = row.map((v) => show(v, c));
    if (d[0] === d[1] && d[1] === d[2]) top3Same++;
    t.push(d[0]);
    gaps.push(d[0] - d[d.length - 1]);
    distinct.push(new Set(d).size);
    for (const v of d) {
      cells++;
      if (v >= c.ceil) atCeil++;
      if (v <= c.floor) atFloor++;
    }
  }
  const ts = [...t].sort((a, b) => a - b);
  return {
    medTop: quant(ts, 0.5),
    p10Top: quant(ts, 0.1),
    p90Top: quant(ts, 0.9),
    medGap: med(gaps),
    medDistinct: med(distinct),
    ceilPct: (100 * atCeil) / cells,
    floorPct: (100 * atFloor) / cells,
    top3SamePct: (100 * top3Same) / tops.length
  };
}

const fmtK = (c: Constants) =>
  `P${String(c.pivot).padStart(2)} C${c.contrast.toFixed(2)} F${String(c.floor).padStart(2)} X${c.ceil}`;

function row(label: string, m: Metrics): string {
  return (
    `  ${label.padEnd(30)} ` +
    `${String(m.medTop).padStart(3)} ` +
    `${String(m.p10Top).padStart(4)} ` +
    `${String(m.p90Top).padStart(4)} ` +
    `${String(m.medGap).padStart(5)} ` +
    `${String(m.medDistinct).padStart(4)}/10 ` +
    `${m.ceilPct.toFixed(1).padStart(6)}% ` +
    `${m.floorPct.toFixed(1).padStart(6)}% ` +
    `${m.top3SamePct.toFixed(1).padStart(7)}%`
  );
}

const HEAD = `  ${"".padEnd(30)} med  p10  p90   gap  dist   @ceil   @floor  top3=`;

// ---------------------------------------------------------------------------
console.log("OAT-108 — match-percentage constant sweep");
console.log("=".repeat(78));

console.log("\n0. Mirror verification");
verifyMirror();

const MODELS: { label: string; noise: number | null; target: boolean }[] = [
  { label: "consistent (lean, noise 0.15)", noise: 0.15, target: true },
  { label: "moderate   (lean, noise 0.30)", noise: 0.3, target: true },
  { label: "weak lean  (lean, noise 0.50)", noise: 0.5, target: false },
  { label: "uniform    (not a real user)", noise: null, target: false }
];

const N_DETAIL = 20000;
const N_SWEEP = 4000;
const POOL = widePool(60, 4242);

// Per model: top-LIST alignments against both pools.
const detail = MODELS.map((m, i) => ({
  ...m,
  wide: topAlignments(sampleUsers(N_DETAIL, 1000 + i, m.noise), POOL),
  seed: topAlignments(sampleUsers(N_DETAIL, 1000 + i, m.noise), ACT)
}));
const sweep = MODELS.map((m, i) => ({
  ...m,
  wide: topAlignments(sampleUsers(N_SWEEP, 1000 + i, m.noise), POOL)
}));

// ---------------------------------------------------------------------------
console.log("\n1. STRUCTURAL — raw alignment, before any constant is applied");
console.log("   These numbers are what the constants have to work with. No pivot,");
console.log("   contrast, floor or ceiling can widen them.");
for (const d of detail) {
  const a1 = d.wide.map((r) => r[0]);
  const g2 = d.wide.map((r) => r[0] - r[1]);
  const g3 = d.wide.map((r) => r[0] - r[2]);
  const g10 = d.wide.map((r) => r[0] - r[LIST - 1]);
  console.log(`\n  ${d.label}`);
  console.log(
    `    top alignment       median ${med(a1).toFixed(1).padStart(5)}   ` +
      `p10 ${quant([...a1].sort((x, y) => x - y), 0.1).toFixed(1)}   ` +
      `p90 ${quant([...a1].sort((x, y) => x - y), 0.9).toFixed(1)}`
  );
  console.log(`    alignment gap 1st->2nd    median ${med(g2).toFixed(2).padStart(5)}`);
  console.log(`    alignment gap 1st->3rd    median ${med(g3).toFixed(2).padStart(5)}`);
  console.log(`    alignment gap 1st->10th   median ${med(g10).toFixed(2).padStart(5)}`);
  console.log(
    `    => at contrast 1.0 the whole visible list spans ${med(g10).toFixed(1)} points;` +
      ` to span 15 points needs contrast ${(15 / med(g10)).toFixed(2)}`
  );
  // The irreducible floor. A badge is an integer, so two places read the same
  // number whenever contrast * alignmentGap rounds below 1. With NO clamping at
  // all, this is the share of users whose top 3 cannot be told apart.
  const un = (c: number) => (100 * g3.filter((v) => v * c < 0.5).length) / g3.length;
  console.log(
    `    structurally identical top 3 (no clamp): ` +
      `contrast 1.0 ${un(1).toFixed(1)}%  1.35 ${un(1.35).toFixed(1)}%  ` +
      `2.0 ${un(2).toFixed(1)}%  3.0 ${un(3).toFixed(1)}%`
  );
}

// ---------------------------------------------------------------------------
console.log("\n\n2. BASELINE — the constants shipping today");
console.log(`   ${fmtK(CURRENT)}`);
console.log("\n   Wide pool (60 places, top 10 shown):");
console.log(HEAD);
for (const d of detail) console.log(row(d.label, metricsFor(d.wide, CURRENT)));
console.log("\n   Seed pool (the 10 real DC activities — list IS the whole pool):");
console.log(HEAD);
for (const d of detail) console.log(row(d.label, metricsFor(d.seed, CURRENT)));

// ---------------------------------------------------------------------------
console.log("\n\n3. SWEEP");
const PIVOTS = [40, 45, 50, 55, 60, 65, 70, 75, 80];
const CONTRASTS = [0.6, 0.8, 1.0, 1.2, 1.35, 1.5, 1.75, 2.0, 2.5, 3.0];
const FLOORS = [20, 30, 38, 45];
const CEILS = [95, 97, 99];

type Scored = { c: Constants; consistent: Metrics; moderate: Metrics; score: number };
const all: Scored[] = [];
for (const pivot of PIVOTS) {
  for (const contrast of CONTRASTS) {
    for (const floor of FLOORS) {
      for (const ceil of CEILS) {
        const c = { pivot, contrast, floor, ceil };
        const consistent = metricsFor(sweep[0].wide, c);
        const moderate = metricsFor(sweep[1].wide, c);
        // Optimise for the two target models only (brief section B).
        // Reward discrimination: distinct values first, then within-list spread.
        const score =
          (consistent.medDistinct + moderate.medDistinct) * 4 + (consistent.medGap + moderate.medGap);
        all.push({ c, consistent, moderate, score });
      }
    }
  }
}
console.log(`   ${all.length.toLocaleString()} constant sets evaluated over ${N_SWEEP.toLocaleString()} users/model.`);

// Believability constraints — a badge that reads 40 for everyone is well spread
// and useless. Keep the top of a consistent user's list in a plausible band and
// keep the ceiling from pinning.
const OK = all.filter(
  (s) =>
    s.consistent.medTop >= 80 &&
    s.consistent.medTop <= 95 &&
    s.consistent.ceilPct <= 5 &&
    s.moderate.medTop >= 65
);
console.log(
  `   ${OK.length.toLocaleString()} satisfy: consistent median top 80–95, <=5% of badges pinned at the ceiling,\n` +
    `   moderate median top >= 65.`
);
console.log("\n   Best 10 by within-list spread (consistent model shown):");
console.log(HEAD);
for (const s of [...OK].sort((a, b) => b.score - a.score).slice(0, 10)) {
  console.log(row(fmtK(s.c), s.consistent));
}
console.log("\n   Best 10 by FEWEST users with an identical top 3 — the metric that");
console.log("   decides whether the badge means anything (consistent model shown):");
console.log(HEAD);
for (const s of [...OK].sort((a, b) => a.consistent.top3SamePct - b.consistent.top3SamePct).slice(0, 10)) {
  console.log(row(fmtK(s.c), s.consistent));
}

// ---------------------------------------------------------------------------
// 3b. The vice: contrast has to serve two ends of the list at once.
// Hold the median top badge at a fixed, believable value by solving for pivot,
// then vary contrast alone. This isolates exactly what contrast buys and costs.
// ---------------------------------------------------------------------------
console.log("\n\n3b. THE VICE — contrast, with the top of the list held at 93");
console.log("   pivot is solved so the median top badge stays 93; only contrast moves.");
console.log("   'ideal' = floor 0 / ceil 100, i.e. the structural limit with no clamp.");
for (const d of [detail[0], detail[1]]) {
  const A = med(d.wide.map((r) => r[0]));
  console.log(`\n  ${d.label}   (median top alignment ${A.toFixed(1)})`);
  console.log("    contrast  pivot   1->2  1->3  1->10  distinct   @ceil  @floor");
  for (const contrast of [1.0, 1.35, 1.75, 2.0, 2.5, 3.0, 4.0, 6.0]) {
    const pivot = contrast === 1 ? 93 - A : (93 - A * contrast) / (1 - contrast);
    const clamped: Constants = { pivot, contrast, floor: 20, ceil: 99 };
    const ideal: Constants = { pivot, contrast, floor: 0, ceil: 100 };
    const g = (k: number, c: Constants) =>
      med(d.wide.map((r) => show(r[0], c) - show(r[k], c)));
    const m = metricsFor(d.wide, clamped);
    const mi = metricsFor(d.wide, ideal);
    console.log(
      `    ${contrast.toFixed(2).padStart(5)}  ${pivot.toFixed(1).padStart(7)}  ` +
        `${String(g(1, ideal)).padStart(4)}  ${String(g(2, ideal)).padStart(4)}  ` +
        `${String(g(9, ideal)).padStart(5)}   ${String(mi.medDistinct).padStart(2)}/10 ideal  ` +
        `${m.ceilPct.toFixed(1).padStart(5)}% ${m.floorPct.toFixed(1).padStart(6)}%  ` +
        `(clamped ${m.medDistinct}/10)`
    );
  }
}

// ---------------------------------------------------------------------------
// Candidate sets, filled in from the sweep above.
// ---------------------------------------------------------------------------
const CANDIDATES: { name: string; c: Constants; note: string }[] = [
  { name: "current  ", c: CURRENT, note: "shipping today" },
  { name: "A confident", c: { pivot: 75, contrast: 1.2, floor: 30, ceil: 99 }, note: "" },
  { name: "B measured ", c: { pivot: 82, contrast: 1.75, floor: 25, ceil: 99 }, note: "" },
  { name: "C honest   ", c: { pivot: 85, contrast: 2.0, floor: 20, ceil: 99 }, note: "" },
  { name: "D stark    ", c: { pivot: 88, contrast: 2.5, floor: 15, ceil: 99 }, note: "" },
  { name: "E flat     ", c: { pivot: 70, contrast: 1.0, floor: 30, ceil: 95 }, note: "" }
];

console.log("\n\n4. CANDIDATES IN DETAIL");
for (const cand of CANDIDATES) {
  console.log(`\n  ${cand.name} — ${fmtK(cand.c)}${cand.note ? `  (${cand.note})` : ""}`);
  console.log(HEAD);
  for (const d of detail) console.log(row(d.label, metricsFor(d.wide, cand.c)));
  console.log("    consistent users' 10-place lists:");
  for (const u of [0, 1, 2]) {
    console.log(`      ${detail[0].wide[u].map((v) => String(show(v, cand.c)).padStart(2)).join(" ")}`);
  }
}
