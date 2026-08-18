/**
 * OAT-107 — measurement only. Nothing here changes scoring; every import is
 * read-only and the file is not shipped in the app bundle.
 *
 * Run:  npx tsx scripts/oat-107-tie-measurement.ts [samples]
 *
 * Answers three questions: how often the quiz produces a tie at the top, which
 * archetypes tie with which, and what the top match percentage actually looks
 * like across the answer space.
 */
import { activities } from "../data/activities";
import { quizQuestions } from "../data/quiz";
import { activityMatchPercentage, scoreQuiz } from "../lib/scoring/recommendations";
import { personalityIds, type PersonalityWeights } from "../types";

const N = Number(process.argv[2] ?? 2_000_000);
const IDS = [...personalityIds];
const DIM = IDS.length;

// ---------------------------------------------------------------------------
// A numeric mirror of the weight data, so millions of samples are feasible.
// Verified against scoreQuiz itself below — if the two ever disagree the script
// aborts rather than reporting numbers from a reimplementation.
// ---------------------------------------------------------------------------
const MATRIX: number[][][] = quizQuestions.map((q) =>
  q.options.map((o) => IDS.map((id) => (o.weights as Partial<PersonalityWeights>)[id] ?? 0))
);
const OPTION_IDS: string[][] = quizQuestions.map((q) => q.options.map((o) => o.id));

/** Deterministic PRNG so every number in the report is reproducible. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function scoreOf(choice: number[]): number[] {
  const s = new Array<number>(DIM).fill(0);
  for (let q = 0; q < choice.length; q++) {
    const w = MATRIX[q][choice[q]];
    for (let i = 0; i < DIM; i++) s[i] += w[i];
  }
  return s;
}

/** Indices tied at the maximum. */
function topTied(s: number[]): number[] {
  let max = -Infinity;
  for (const v of s) if (v > max) max = v;
  const tied: number[] = [];
  for (let i = 0; i < DIM; i++) if (s[i] === max) tied.push(i);
  return tied;
}

/** Best match percentage over the seed activity set, using the shipped fn. */
function topMatchPct(s: number[]): number {
  const weights = Object.fromEntries(IDS.map((id, i) => [id, s[i]])) as PersonalityWeights;
  let best = 0;
  for (const a of activities) {
    const p = activityMatchPercentage(a, weights);
    if (p > best) best = p;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Cross-check: the fast path must agree with scoreQuiz exactly.
// ---------------------------------------------------------------------------
function verifyAgainstScoreQuiz(rand: () => number, trials = 2000): void {
  for (let t = 0; t < trials; t++) {
    const choice = quizQuestions.map(() => Math.floor(rand() * 8));
    const answers = Object.fromEntries(
      quizQuestions.map((q, i) => [q.id, OPTION_IDS[i][choice[i]]])
    );
    const real = scoreQuiz(quizQuestions, answers);
    if (!real) throw new Error("scoreQuiz returned null on a complete answer set");
    const fast = scoreOf(choice);
    IDS.forEach((id, i) => {
      if (real.scores[id] !== fast[i]) {
        throw new Error(`fast path disagrees with scoreQuiz on ${id}`);
      }
    });
    // E: the shipped dominant must be the tied archetype earliest in personalityIds.
    const tied = topTied(fast);
    if (IDS[tied[0]] !== real.dominant) {
      throw new Error(`tie-break is not array order: got ${real.dominant}, expected ${IDS[tied[0]]}`);
    }
  }
}

type Run = {
  label: string;
  tieCounts: number[];
  pairs: Map<string, number>;
  winners: number[];
  tiedWinners: number[];
  pct: number[];
  /** Raw points between 1st and 2nd. 0 is a tie; 1 is one answer from a tie. */
  gaps: number[];
  n: number;
};

function emptyRun(label: string, n: number): Run {
  return {
    label,
    tieCounts: new Array(DIM + 1).fill(0),
    pairs: new Map(),
    winners: new Array(DIM).fill(0),
    tiedWinners: new Array(DIM).fill(0),
    pct: [],
    gaps: [],
    n
  };
}

function record(run: Run, s: number[]): void {
  const tied = topTied(s);
  run.tieCounts[tied.length]++;
  run.winners[tied[0]]++;
  if (tied.length > 1) {
    run.tiedWinners[tied[0]]++;
    for (let i = 0; i < tied.length; i++) {
      for (let j = i + 1; j < tied.length; j++) {
        const k = `${IDS[tied[i]]} + ${IDS[tied[j]]}`;
        run.pairs.set(k, (run.pairs.get(k) ?? 0) + 1);
      }
    }
  }
  run.pct.push(topMatchPct(s));

  // Margin of victory. A tie is just gap 0, so this shows how much of the
  // population sits one answer away from one — the tie rate alone understates
  // how close the race is.
  const sorted = [...s].sort((a, b) => b - a);
  run.gaps.push(sorted[0] - sorted[1]);
}

/** Uniform: every option equally likely. The whole answer space, sampled. */
function runUniform(n: number, seed: number): Run {
  const rand = mulberry32(seed);
  const run = emptyRun("uniform over the answer space", n);
  const choice = new Array<number>(quizQuestions.length);
  for (let k = 0; k < n; k++) {
    for (let q = 0; q < choice.length; q++) choice[q] = Math.floor(rand() * 8);
    record(run, scoreOf(choice));
  }
  return run;
}

/**
 * "Plausible": a person with a real lean who is inconsistent some of the time.
 * A target archetype is drawn uniformly, then each question follows the option
 * that most favours it, except with probability `noise` where the answer is
 * drawn uniformly. noise = 1 collapses to the uniform model.
 */
function runLeaning(n: number, seed: number, noise: number): Run {
  const rand = mulberry32(seed);
  const run = emptyRun(`plausible (lean, noise=${noise})`, n);
  const choice = new Array<number>(quizQuestions.length);
  // Precompute, per question, the option index that best serves each archetype.
  const best: number[][] = MATRIX.map((opts) =>
    IDS.map((_, i) => {
      let bi = 0;
      for (let o = 1; o < opts.length; o++) if (opts[o][i] > opts[bi][i]) bi = o;
      return bi;
    })
  );
  for (let k = 0; k < n; k++) {
    const target = Math.floor(rand() * DIM);
    for (let q = 0; q < choice.length; q++) {
      choice[q] = rand() < noise ? Math.floor(rand() * 8) : best[q][target];
    }
    record(run, scoreOf(choice));
  }
  return run;
}

const pct = (x: number, n: number) => `${((100 * x) / n).toFixed(3)}%`;
/** 95% CI half-width for a proportion. */
const ci = (x: number, n: number) => {
  const p = x / n;
  return `±${(100 * 1.96 * Math.sqrt((p * (1 - p)) / n)).toFixed(3)}%`;
};

function reportRun(run: Run): void {
  const { n } = run;
  console.log(`\n--- ${run.label} (n = ${n.toLocaleString()}) ---`);
  const ties = run.tieCounts.slice(2).reduce((a, b) => a + b, 0);
  console.log(`  any tie at the top : ${pct(ties, n)} ${ci(ties, n)}`);
  for (let k = 2; k <= DIM; k++) {
    if (run.tieCounts[k] > 0) {
      console.log(`  ${k}-way tie          : ${pct(run.tieCounts[k], n)} ${ci(run.tieCounts[k], n)}`);
    }
  }
  if (ties > 0) {
    console.log("  most frequent tied pairs:");
    [...run.pairs.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .forEach(([k, c]) => console.log(`    ${pct(c, n).padStart(8)}  ${k}`));
    console.log("  who array order hands the tie to:");
    run.tiedWinners.forEach((c, i) => {
      if (c > 0) console.log(`    ${pct(c, ties).padStart(8)} of ties  ${IDS[i]}`);
    });
  }
  // Margin of victory: how many raw points separate 1st from 2nd.
  const g = new Map<number, number>();
  for (const v of run.gaps) g.set(Math.min(v, 5), (g.get(Math.min(v, 5)) ?? 0) + 1);
  console.log("  margin between 1st and 2nd (raw points):");
  [...g.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([v, c]) =>
      console.log(`    ${v === 5 ? "5+" : ` ${v}`} point${v === 1 ? " " : "s"}  ${pct(c, n).padStart(8)}`)
    );

  const sorted = [...run.pct].sort((a, b) => a - b);
  const q = (f: number) => sorted[Math.floor(f * (sorted.length - 1))];
  console.log("  top match % across the set:");
  console.log(
    `    min ${sorted[0]}  p10 ${q(0.1)}  median ${q(0.5)}  p90 ${q(0.9)}  max ${sorted[sorted.length - 1]}`
  );
  const hist = new Map<number, number>();
  for (const v of sorted) {
    const bucket = Math.floor(v / 5) * 5;
    hist.set(bucket, (hist.get(bucket) ?? 0) + 1);
  }
  [...hist.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([b, c]) =>
      console.log(
        `    ${String(b).padStart(3)}–${b + 4}  ${pct(c, sorted.length).padStart(8)}  ${"#".repeat(Math.round((60 * c) / sorted.length))}`
      )
    );
}

// ---------------------------------------------------------------------------
console.log("OAT-107 — tie frequency and match-percentage distribution");
console.log("=".repeat(64));

const space = Math.pow(quizQuestions.length ? 8 : 0, quizQuestions.length);
console.log(`\nA. Answer space`);
console.log(`  questions            : ${quizQuestions.length}`);
console.log(`  options per question : 8`);
console.log(`  distinct answer sets : 8^${quizQuestions.length} = ${space.toExponential(4)}`);
console.log(`  full enumeration     : INTRACTABLE (${(space / 1e12).toFixed(1)} trillion)`);
console.log(`  method               : seeded Monte Carlo, ${N.toLocaleString()} samples per model`);

// The shape of the score space — measured from the weight data, not asserted.
// This is what makes ties as common as they are: scores are small integers.
const weightVals = new Set<number>();
const optionSums = new Set<number>();
const touched = new Set<number>();
for (const q of quizQuestions) {
  for (const o of q.options) {
    const w = IDS.map((id) => (o.weights as Partial<PersonalityWeights>)[id] ?? 0);
    w.forEach((v) => weightVals.add(v));
    optionSums.add(w.reduce((a, b) => a + b, 0));
    touched.add(w.filter((v) => v !== 0).length);
  }
}
const asc = (s: Set<number>) => [...s].sort((a, b) => a - b).join(", ");
console.log(`\nB0. Shape of the score space (why ties happen at all)`);
console.log(`  distinct weight values     : ${asc(weightVals)}`);
console.log(`  points awarded per option  : ${asc(optionSums)}`);
console.log(`  archetypes touched/option  : ${asc(touched)} of ${DIM}`);
const sumRange = [...optionSums].sort((a, b) => a - b);
console.log(
  `  => a completed quiz spreads ${sumRange[0] * quizQuestions.length}–${
    sumRange[sumRange.length - 1] * quizQuestions.length
  } points over ${DIM} archetypes;`
);
console.log(`     the mean archetype score is ~6, and scores are integers, so`);
console.log(`     collisions are arithmetic, not a data-entry mistake.`);
IDS.forEach((id) => {
  let lo = 0;
  let hi = 0;
  for (const q of quizQuestions) {
    const ws = q.options.map((o) => (o.weights as Partial<PersonalityWeights>)[id] ?? 0);
    lo += Math.min(...ws);
    hi += Math.max(...ws);
  }
  console.log(`     ${id.padEnd(18)} reachable ${lo}..${hi}`);
});

console.log(`\nE. Tie-break, verified against the shipped scoreQuiz`);
verifyAgainstScoreQuiz(mulberry32(99));
console.log(`  2,000 cross-checks: fast path matches scoreQuiz exactly,`);
console.log(`  and every tie resolved to the archetype earliest in personalityIds.`);
console.log(`  personalityIds order: ${IDS.join(" > ")}`);

reportRun(runUniform(N, 1));
for (const noise of [0.15, 0.3, 0.5]) {
  reportRun(runLeaning(Math.min(N, 500_000), 7, noise));
}

console.log(`\nD. Match-percentage constants actually in the code today`);
console.log(`  MATCH_PIVOT 50 · MATCH_CONTRAST 1.35 · MATCH_FLOOR 38 · MATCH_CEIL 99`);
console.log(`  Measured against the ${activities.length} seed activities (all washington-dc);`);
console.log(`  live Places activities carry their own score maps and are not enumerable here.`);
