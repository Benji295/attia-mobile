// Pure gamification engine. All numbers derive from persisted state — no
// double-counting, no hidden counters. Used by the Profile screen.

// A "full day" of planning = 3+ saved stops (a day's worth of activities).
export const FULL_DAY_MIN_STOPS = 3;
// Unlock threshold for the "Perfect match" badge.
export const PERFECT_MATCH_MIN = 75;
// Streak length that unlocks the "7-day streak" badge.
export const STREAK_BADGE_DAYS = 7;
// Distinct cities explored that unlock the "City hopper" badge.
export const CITY_HOPPER_MIN_CITIES = 2;

export function isFullDay(savedCount: number): boolean {
  return savedCount >= FULL_DAY_MIN_STOPS;
}

/**
 * Does this save complete a multi-stop plan — i.e. should itinerary_built fire?
 * Once, on the 2 -> 3 transition WITHIN ONE CITY (OAT-61).
 *
 * The count passed here must be the ACTIVE city's, never the global one: one
 * save each in DC, NYC and Miami is three saves but no plan — no city has a
 * multi-stop day — and itinerary_built is an OAT-7 funnel metric, so it has to
 * mean what it says.
 */
export function firesItineraryBuilt(beforeCountInCity: number): boolean {
  return beforeCountInCity + 1 === FULL_DAY_MIN_STOPS;
}

/**
 * XP is a pure function of state:
 *   (hasResult ? 50) + savedCount*10 + (fullDay ? 30)
 * Recomputed from state every render, so it can never drift or double-count.
 */
export function computeXp(hasResult: boolean, savedCount: number): number {
  return (hasResult ? 50 : 0) + savedCount * 10 + (isFullDay(savedCount) ? 30 : 0);
}

export type LevelInfo = {
  level: number; // Lv N
  progress: number; // XP into the current level, 0–99
  toNext: number; // XP remaining to the next level
};

export function levelInfo(xp: number): LevelInfo {
  const level = Math.floor(xp / 100) + 1;
  const progress = xp % 100;
  return { level, progress, toNext: 100 - progress };
}
