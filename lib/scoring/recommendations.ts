import { personalities } from "../../data/personalities";
import {
  Activity,
  PersonalityId,
  PersonalityWeights,
  QuizQuestion,
  QuizResult,
  RankedActivity,
  personalityIds
} from "../../types";
import { emptyWeights, mergeWeights } from "../constants";

export function scoreQuiz(
  questions: QuizQuestion[],
  answers: Record<string, string>
): QuizResult | null {
  if (Object.keys(answers).length !== questions.length) {
    return null;
  }

  const scores = questions.reduce((acc, question) => {
    const option = question.options.find((item) => item.id === answers[question.id]);
    if (!option) {
      return acc;
    }
    return mergeWeights(acc, option.weights);
  }, emptyWeights());

  const ranking = [...personalityIds].sort((a, b) => scores[b] - scores[a]);

  return {
    dominant: ranking[0],
    secondary: ranking.slice(1, 3),
    scores
  };
}

export function getPersonalityProfile(id: PersonalityId) {
  return personalities.find((item) => item.id === id) ?? personalities[0];
}

// How sharply differences in alignment are expanded into the displayed match %.
// The raw alignment is a weighted average of the activity's personality scores
// (0–100). Centering at MATCH_PIVOT and applying MATCH_CONTRAST > 1 spreads the
// distribution so a strong match reads high and a weak one reads low, instead of
// being flattened by a hardcoded floor.
const MATCH_PIVOT = 50;
const MATCH_CONTRAST = 1.35;
const MATCH_FLOOR = 38;
const MATCH_CEIL = 99;

export function activityMatchPercentage(activity: Activity, scores: PersonalityWeights): number {
  const totalUser = personalityIds.reduce((sum, id) => sum + scores[id], 0) || 1;

  // Weighted average of the activity's per-personality scores, weighted by the
  // user's normalized personality distribution. Alignment lives in ~0–100.
  const alignment = personalityIds.reduce((sum, id) => {
    const normalizedUserWeight = scores[id] / totalUser;
    return sum + normalizedUserWeight * activity.personalityScores[id];
  }, 0);

  // Spread the distribution. NOTE: this transform is strictly monotonic in
  // `alignment`, so ranking order is preserved while the visible band widens.
  // We deliberately do NOT floor at a high value (the old 52) — that compressed
  // every weak/unspecified-trait match into a narrow band near the top.
  const spread = MATCH_PIVOT + (alignment - MATCH_PIVOT) * MATCH_CONTRAST;

  return Math.max(MATCH_FLOOR, Math.min(MATCH_CEIL, Math.round(spread)));
}

export function topPersonalityTraits(scores: PersonalityWeights, count = 2): PersonalityId[] {
  return [...personalityIds].sort((a, b) => scores[b] - scores[a]).slice(0, count);
}

export function explainActivityMatch(
  activity: Activity,
  scores: PersonalityWeights,
  dominant: PersonalityId,
  secondary: PersonalityId[]
) {
  // Explanation is derived purely from personality alignment between the user
  // and the activity — no hardcoded category/vibe/dayPart overrides (those
  // bypassed the real logic and are intentionally removed; see CLAUDE.md).
  const rankedActivityTraits = [...personalityIds]
    .sort((a, b) => activity.personalityScores[b] - activity.personalityScores[a])
    .slice(0, 2);

  const activityTop = rankedActivityTraits[0];
  const traitLabels = rankedActivityTraits.map((id) => getPersonalityProfile(id).traits[0]);

  const shortName = (id: PersonalityId) => getPersonalityProfile(id).name.replace("The ", "");

  let explanation: string;
  if (activityTop === dominant) {
    explanation = `A natural fit for your ${shortName(dominant)} energy.`;
  } else if (secondary.includes(activityTop)) {
    explanation = `Plays to your ${shortName(activityTop).toLowerCase()} secondary streak.`;
  } else {
    explanation = `Leans ${shortName(activityTop).toLowerCase()}, with room for your ${shortName(dominant).toLowerCase()} side.`;
  }

  return {
    explanation,
    traitLabels,
    affinityLabel: getPersonalityProfile(activityTop).name
  };
}

export function rankActivities(
  activities: Activity[],
  cityId: string,
  scores: PersonalityWeights,
  result?: QuizResult | null
): RankedActivity[] {
  const resolvedDominant = result?.dominant ?? topPersonalityTraits(scores, 1)[0];
  const resolvedSecondary = result?.secondary ?? topPersonalityTraits(scores, 3).slice(1);

  return activities
    .filter((activity) => activity.city === cityId)
    .map((activity) => describeActivityMatch(activity, scores, resolvedDominant, resolvedSecondary))
    .sort((a, b) => b.match - a.match);
}

export function describeActivityMatch(
  activity: Activity,
  scores: PersonalityWeights,
  dominant: PersonalityId,
  secondary: PersonalityId[]
): RankedActivity {
  const match = activityMatchPercentage(activity, scores);
  const explanation = explainActivityMatch(activity, scores, dominant, secondary);

  return {
    activity,
    match,
    explanation: explanation.explanation,
    traitLabels: explanation.traitLabels
  };
}
