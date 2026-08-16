import type { ImageSourcePropType } from "react-native";
import { archetypeImages } from "./archetypeImages";
import type { QuizResult } from "../types";

/**
 * THE image that represents this user (OAT-14 / OAT-105).
 *
 * One source of truth for every surface that shows the user back to themselves:
 * Profile's hero, Home's header avatar, and — when it lands — OAT-78's share
 * card. Deliberately named for the ROLE ("the image for this user") rather than
 * its current implementation ("the archetype card"), because OAT-106 will let a
 * custom photo override it. That override belongs in this function, so every
 * surface picks it up at once and no screen has to know the rule.
 *
 * Returns null when there is no identity to show yet. Callers render their own
 * no-identity state rather than being handed a placeholder — a profile with no
 * quiz result should look empty, not look like somebody else.
 */
export function userImageSource(result: QuizResult | null): ImageSourcePropType | null {
  if (!result) return null;
  return archetypeImages[result.dominant] ?? null;
}
