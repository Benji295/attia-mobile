export type Activity = {
  id: string;
  title: string;
  city: string;
  match: number;
  tags: string;
  icon: string; // Ionicons name
  accent: string; // placeholder
};

// Hardcoded sample. Replaced by live Google Places data via the Vercel proxy (OAT-9) + DC support (OAT-5).
export const ACTIVITIES: Activity[] = [
  { id: "a1", title: "Sunset kayak on the Potomac", city: "Washington DC", match: 94, tags: "Adrenaline · Explorer", icon: "water-outline", accent: "#1D9E75" },
  { id: "a2", title: "Hidden speakeasy tasting", city: "Washington DC", match: 89, tags: "Epicurean · Connoisseur", icon: "wine-outline", accent: "#BA7517" },
  { id: "a3", title: "After-hours at the Hirshhorn", city: "Washington DC", match: 86, tags: "Culture Vulture", icon: "business-outline", accent: "#D85A30" },
  { id: "a4", title: "Group supper club · 12 seats", city: "Washington DC", match: 82, tags: "Socialite · Connector", icon: "people-outline", accent: "#D4537E" },
];
