import { PersonalityId, PersonalityWeights, personalityIds } from "../types";

// Personality weight helpers used by the scoring engine. Ported from the web
// prototype's lib/constants.ts (the XP/itinerary constants there are
// gamification — intentionally not ported; see CLAUDE.md).

export function emptyWeights(): PersonalityWeights {
  return personalityIds.reduce((acc, id) => {
    acc[id] = 0;
    return acc;
  }, {} as PersonalityWeights);
}

export function mergeWeights(
  base: PersonalityWeights,
  addition: Partial<Record<PersonalityId, number>>
): PersonalityWeights {
  const merged = { ...base };
  Object.entries(addition).forEach(([key, value]) => {
    merged[key as PersonalityId] += value ?? 0;
  });
  return merged;
}
