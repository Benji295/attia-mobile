import { getPersonalityProfile } from "./scoring/recommendations";
import type { QuizResult } from "../types";

/**
 * The reveal's blend sentence (OAT-102).
 *
 * Every Connoisseur used to read the same static summary. This says something
 * about THIS person instead, built from the score vector the engine already
 * produced — nothing is recomputed and no new scoring happens here.
 *
 *   "Connoisseur, with a strong Socialite streak — you plan carefully, then
 *    want the room to be full."
 */

/**
 * How strong a secondary has to be, relative to the dominant, before the
 * sentence calls it a "strong streak". A streak that is 40% of the dominant is
 * not a streak, and saying so would be a lie the user can feel.
 */
export const STREAK_MIN_RATIO = 0.7;

/** Archetype name without the article — "The Socialite" -> "Socialite". */
function shortName(name: string): string {
  return name.replace(/^The /, "");
}

/** Is the top secondary strong enough to earn the streak half of the sentence? */
export function hasStrongStreak(result: QuizResult): boolean {
  const secondaryId = result.secondary[0];
  if (!secondaryId) return false;
  const dominantScore = result.scores[result.dominant];
  if (!dominantScore || dominantScore <= 0) return false;
  return result.scores[secondaryId] / dominantScore >= STREAK_MIN_RATIO;
}

/**
 * Build the sentence. Falls back to the archetype's static summary if either
 * clause is missing, so a half-written data entry degrades to the old copy
 * rather than rendering a fragment.
 */
export function blendSentence(result: QuizResult): string {
  const dominant = getPersonalityProfile(result.dominant);
  if (!dominant.dominantClause) return dominant.summary;

  const lead = `${shortName(dominant.name)} — ${dominant.dominantClause}`;

  if (!hasStrongStreak(result)) return `${lead}.`;

  const secondary = getPersonalityProfile(result.secondary[0]);
  if (!secondary.secondaryClause) return `${lead}.`;

  return (
    `${shortName(dominant.name)}, with a strong ${shortName(secondary.name)} streak — ` +
    `${dominant.dominantClause}, ${secondary.secondaryClause}.`
  );
}
