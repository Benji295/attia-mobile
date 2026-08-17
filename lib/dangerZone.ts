/**
 * Copy for the reset confirmation (OAT-93).
 *
 * Named separately and kept pure so the sentence can be tested: a destructive
 * confirmation that misstates what it destroys is worse than no confirmation,
 * because it buys consent under false terms.
 */

export type ResetCounts = {
  savedPlaces: number;
  plannedStops: number;
  citiesExplored: number;
  /** Short archetype name, e.g. "Socialite". Null before the quiz. */
  archetype: string | null;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Everything reset() actually destroys, with live counts. Clauses with a count
 * of zero are omitted — "0 saved places" reads as filler and trains people to
 * skim the one sentence that must be read.
 */
export function resetSummary(counts: ResetCounts): string {
  const parts: string[] = [];
  if (counts.savedPlaces > 0) parts.push(plural(counts.savedPlaces, "saved place", "saved places"));
  if (counts.plannedStops > 0)
    parts.push(plural(counts.plannedStops, "planned stop", "planned stops"));
  if (counts.citiesExplored > 0)
    parts.push(plural(counts.citiesExplored, "city explored", "cities explored"));
  if (counts.archetype) parts.push(`your ${counts.archetype} result`);

  if (parts.length === 0) return "There is nothing saved to delete yet. This cannot be undone.";

  const list =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
  return `This deletes ${list}. This cannot be undone.`;
}

/** The word that must be typed, exactly and case-sensitively. */
export const RESET_PHRASE = "RESET";

export function isResetConfirmed(input: string): boolean {
  return input === RESET_PHRASE;
}
