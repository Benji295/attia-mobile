import { City } from "../types";

export const cities: City[] = [
  {
    id: "new-york",
    name: "New York",
    state: "NY",
    tagline: "Big energy, hidden gems, and all-night momentum."
  },
  {
    id: "washington-dc",
    name: "Washington DC",
    state: "DC",
    tagline: "Monuments, markets, and a deeper cultural pulse than most guess."
  },
  {
    id: "miami",
    name: "Miami",
    state: "FL",
    tagline: "Sunset color, bold flavor, and late-night sparkle."
  }
];

export const cityCenters: Record<string, { lat: number; lng: number; radiusMeters: number }> = {
  "new-york": { lat: 40.758, lng: -73.9855, radiusMeters: 8000 },
  "washington-dc": { lat: 38.8951, lng: -77.0364, radiusMeters: 8000 },
  miami: { lat: 25.7617, lng: -80.1918, radiusMeters: 12000 }
};
