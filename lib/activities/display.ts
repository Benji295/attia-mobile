import { ATTIA_API_BASE } from "../config";
import { getPersonalityProfile } from "../scoring/recommendations";
import { personalityIds, type Activity } from "../../types";

// Single source of truth for activity display helpers shared by Discover + Home.

/**
 * The API returns a relative image path (e.g. "/api/places/photo?...").
 * Prefix it with the API origin so it loads; absolute URLs pass through.
 */
export function photoUri(a: Activity): string | null {
  if (!a.image) return null;
  return a.image.startsWith("http") ? a.image : `${ATTIA_API_BASE}${a.image}`;
}

/** Accent color of the activity's strongest archetype. */
export function accentFor(a: Activity): string {
  const topId = personalityIds.reduce((best, id) =>
    a.personalityScores[id] > a.personalityScores[best] ? id : best
  );
  return getPersonalityProfile(topId).accent;
}
