import { ATTIA_API_BASE } from "../config";
import type { Activity } from "../../types";

export class PlacesFetchError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "PlacesFetchError";
    this.status = status;
  }
}

type PlacesResponse = {
  activities: Activity[];
  cityId: string;
  center: { lat: number; lng: number };
};

/**
 * Fetch live activities for a city from the Places proxy.
 * Throws PlacesFetchError on non-2xx responses or network failure.
 */
export async function getActivities(cityId = "washington-dc"): Promise<Activity[]> {
  const url = `${ATTIA_API_BASE}/api/places?cityId=${encodeURIComponent(cityId)}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new PlacesFetchError(`Network error fetching activities: ${(e as Error).message}`);
  }

  if (!res.ok) {
    throw new PlacesFetchError(`Places request failed (HTTP ${res.status})`, res.status);
  }

  let data: PlacesResponse;
  try {
    data = (await res.json()) as PlacesResponse;
  } catch (e) {
    throw new PlacesFetchError(`Malformed Places response: ${(e as Error).message}`);
  }

  return data.activities ?? [];
}
