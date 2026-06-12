// The three pilot cities, defined once and reused everywhere (selector, store,
// fetch, labels). cityId matches the proxy's cityCenters keys.
export type CityId = "washington-dc" | "new-york" | "miami";

export const CITIES: { id: CityId; label: string }[] = [
  { id: "washington-dc", label: "Washington DC" },
  { id: "new-york", label: "New York" },
  { id: "miami", label: "Miami" }
];

export const DEFAULT_CITY: CityId = "washington-dc";

export function cityLabel(id: string): string {
  return CITIES.find((c) => c.id === id)?.label ?? id;
}
