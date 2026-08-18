/**
 * Shared measurement model for the OAT-107/108 scripts.
 *
 * MEASUREMENT ONLY — nothing here is imported by the app. The match constants
 * are module-private in lib/scoring/recommendations.ts, so they are mirrored
 * here and must be cross-checked with verifyMirror() before any number derived
 * from them is reported.
 *
 * scripts/oat-107-tie-measurement.ts and scripts/oat-108-percentage-sweep.ts
 * deliberately keep their own inline copies of the sampler so their already
 * published numbers keep reproducing byte-for-byte from the files that
 * produced them. New scripts should import from here.
 */
import { quizQuestions } from "../../data/quiz";
import { activityMatchPercentage } from "../../lib/scoring/recommendations";
import { personalityIds, type Activity, type PersonalityWeights } from "../../types";

export const IDS = [...personalityIds];
export const DIM = IDS.length;

export type Constants = { pivot: number; contrast: number; floor: number; ceil: number };
/** Mirrored from lib/scoring/recommendations.ts. Verified by verifyMirror(). */
export const CURRENT: Constants = { pivot: 50, contrast: 1.35, floor: 38, ceil: 99 };

export const MATRIX: number[][][] = quizQuestions.map((q) =>
  q.options.map((o) => IDS.map((id) => (o.weights as Partial<PersonalityWeights>)[id] ?? 0))
);

/** Per question, the option index that most favours each archetype. */
export const BEST: number[][] = MATRIX.map((opts) =>
  IDS.map((_, i) => {
    let bi = 0;
    for (let o = 1; o < opts.length; o++) if (opts[o][i] > opts[bi][i]) bi = o;
    return bi;
  })
);

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function scoreOf(choice: number[]): number[] {
  const s = new Array<number>(DIM).fill(0);
  for (let q = 0; q < choice.length; q++) {
    const w = MATRIX[q][choice[q]];
    for (let i = 0; i < DIM; i++) s[i] += w[i];
  }
  return s;
}

/** The quiz result of someone who answers every question toward one archetype. */
export function purePath(target: number): number[] {
  return scoreOf(MATRIX.map((_, q) => BEST[q][target]));
}

/**
 * `noise === null` => uniform over the answer space. Otherwise a target
 * archetype is drawn and each question follows the option that most favours
 * it, except with probability `noise`. Identical to OAT-107's model.
 */
export function sampleUsers(n: number, seed: number, noise: number | null): number[][] {
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

/** Activity personality-score vectors, in IDS order. */
export function poolOf(activities: Activity[]): number[][] {
  return activities.map((a) => IDS.map((id) => a.personalityScores[id]));
}

/**
 * The constant-independent half of the pipeline: a convex combination of the
 * activity's personality scores, weighted by the user's normalised
 * distribution. No choice of constants can widen the spread this produces.
 */
export function alignmentsFor(raw: number[], pool: number[][]): number[] {
  const total = raw.reduce((a, b) => a + b, 0) || 1;
  const norm = raw.map((v) => v / total);
  return pool.map((act) => {
    let s = 0;
    for (let i = 0; i < DIM; i++) s += norm[i] * act[i];
    return s;
  });
}

/** The shipped transform, parameterised. Strictly monotonic in `alignment`. */
export function show(alignment: number, c: Constants = CURRENT): number {
  return Math.max(
    c.floor,
    Math.min(c.ceil, Math.round(c.pivot + (alignment - c.pivot) * c.contrast))
  );
}

/**
 * Prove the mirror still reproduces the shipped function on the exact activity
 * data being measured. Exits non-zero on any disagreement rather than letting a
 * stale constant quietly corrupt a report.
 */
export function verifyMirror(activities: Activity[], trials = 2000, seed = 20250108): number {
  const pool = poolOf(activities);
  const users = sampleUsers(trials, seed, 0.3);
  let checks = 0;
  for (const raw of users) {
    const weights = Object.fromEntries(IDS.map((id, i) => [id, raw[i]])) as PersonalityWeights;
    const align = alignmentsFor(raw, pool);
    for (let a = 0; a < activities.length; a++) {
      if (show(align[a], CURRENT) !== activityMatchPercentage(activities[a], weights)) {
        console.error(
          `ABORT: mirror disagrees with activityMatchPercentage on ${activities[a].id}`
        );
        process.exit(1);
      }
      checks++;
    }
  }
  return checks;
}

export const quant = (sorted: number[], f: number) => sorted[Math.floor(f * (sorted.length - 1))];
export const med = (xs: number[]) => quant([...xs].sort((a, b) => a - b), 0.5);
