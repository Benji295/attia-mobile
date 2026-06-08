export type Archetype = { key: string; name: string; accent: string; blurb: string };

// NOTE: accent colors are PLACEHOLDERS. Final palette is being decided (OAT-2 / OAT-8).
// When locked, update these in one place and the whole app picks them up.
export const PERSONALITIES: Record<string, Archetype> = {
  explorer: { key: "explorer", name: "Explorer", accent: "#1D9E75", blurb: "You chase the unmarked trail and the plan-free day." },
  socialite: { key: "socialite", name: "Socialite", accent: "#D4537E", blurb: "You travel for the people — the rooftop, the table, the crowd." },
  connoisseur: { key: "connoisseur", name: "Connoisseur", accent: "#534AB7", blurb: "You want the considered, the curated, the quietly excellent." },
  connector: { key: "connector", name: "Connector", accent: "#378ADD", blurb: "You travel to be with your people, old and new." },
  culture_vulture: { key: "culture_vulture", name: "Culture Vulture", accent: "#D85A30", blurb: "History, museums, the soul of a place — that's your map." },
  epicurean: { key: "epicurean", name: "Epicurean", accent: "#BA7517", blurb: "You follow the food and the wine, everywhere." },
  adrenaline: { key: "adrenaline", name: "Adrenaline Junkie", accent: "#E24B4A", blurb: "If it gets the heart going, you're in." },
  savvy: { key: "savvy", name: "Savvy Traveler", accent: "#639922", blurb: "You find the gem and the deal everyone else missed." },
};
