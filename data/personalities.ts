import { PersonalityProfile } from "../types";

export const personalities: PersonalityProfile[] = [
  {
    id: "socialite",
    name: "The Socialite",
    description: "You chase energy, chemistry, and unforgettable group moments.",
    summary: "You move through cities with momentum, sparkle, and an instinct for the places people talk about the next day.",
    accent: "#FB7185",
    accentSoft: "#FFE4E6",
    traits: ["Outgoing", "Spontaneous", "Magnetic"],
    bestFor: ["buzzing rooftops", "group nights out", "scene-y openings"],
    suggestedCategories: ["Nightlife", "Live Music", "Rooftops"],
    cityVibe: "Best in neighborhoods with late-night energy, movement, and a social pulse."
  },
  {
    id: "explorer",
    name: "The Explorer",
    description: "You want the story behind the city, not just the postcard version.",
    summary: "You are most at home in places with texture, curiosity, and enough unpredictability to feel discovered instead of assigned.",
    accent: "#06B6D4",
    accentSoft: "#CFFAFE",
    traits: ["Curious", "Independent", "Adventurous"],
    bestFor: ["hidden neighborhoods", "wandering afternoons", "unexpected finds"],
    suggestedCategories: ["Neighborhood Crawls", "Outdoor Routes", "Local Finds"],
    cityVibe: "Best in walkable neighborhoods where one good turn leads to another."
  },
  {
    id: "connoisseur",
    name: "The Connoisseur",
    description: "You look for craft, detail, and places with a refined point of view.",
    summary: "You notice quality immediately and gravitate toward experiences with taste, precision, and a point of view worth dressing for.",
    accent: "#7C3AED",
    accentSoft: "#EDE9FE",
    traits: ["Intentional", "Discerning", "Stylish"],
    bestFor: ["chef counters", "design hotels", "beautiful rooms"],
    suggestedCategories: ["Dining", "Design", "Boutique Stays"],
    cityVibe: "Best in polished corners of the city where detail and atmosphere matter."
  },
  {
    id: "connector",
    name: "The Connector",
    description: "You are at your best when experiences deepen relationships and spark conversation.",
    summary: "You build your favorite memories around people, warmth, and experiences that leave everyone with more to talk about on the walk home.",
    accent: "#14B8A6",
    accentSoft: "#CCFBF1",
    traits: ["Warm", "Thoughtful", "Community-minded"],
    bestFor: ["intimate gatherings", "shared meals", "conversation-led evenings"],
    suggestedCategories: ["Intimate Gatherings", "Food Tours", "Shared Tables"],
    cityVibe: "Best in welcoming places that feel easy to settle into together."
  },
  {
    id: "culture-vulture",
    name: "The Culture Vulture",
    description: "You gravitate toward creativity, expression, and the pulse of local culture.",
    summary: "You want cities to feel alive with art, ideas, and local expression, and you are drawn to places that say something beyond the surface.",
    accent: "#8B5CF6",
    accentSoft: "#F3E8FF",
    traits: ["Creative", "Observant", "Expressive"],
    bestFor: ["gallery nights", "live performance", "creative districts"],
    suggestedCategories: ["Culture", "Art", "Performance"],
    cityVibe: "Best in neighborhoods where the city’s creative identity is impossible to miss."
  },
  {
    id: "epicurean",
    name: "The Epicurean",
    description: "You plan around taste, atmosphere, and indulgent little luxuries.",
    summary: "You remember cities through flavor, lighting, service, and the way a room makes the whole night feel slower and richer.",
    accent: "#F59E0B",
    accentSoft: "#FEF3C7",
    traits: ["Sensory", "Relaxed", "Pleasure-seeking"],
    bestFor: ["tasting menus", "market strolls", "slow lunches"],
    suggestedCategories: ["Dining", "Wine Bars", "Food Tours"],
    cityVibe: "Best in neighborhoods with strong kitchens, layered atmosphere, and room to linger."
  },
  {
    id: "adrenaline-junkie",
    name: "The Adrenaline Junkie",
    description: "You want motion, challenge, and stories that come with a pulse spike.",
    summary: "You are most drawn to plans that feel active, vivid, and slightly hard to explain without a grin at the end of the story.",
    accent: "#EF4444",
    accentSoft: "#FEE2E2",
    traits: ["Bold", "Fearless", "Energetic"],
    bestFor: ["water speed", "outdoor challenge", "high-intensity outings"],
    suggestedCategories: ["Adventure", "Outdoor Sports", "Water Activities"],
    cityVibe: "Best in cities that let you trade sitting still for movement."
  },
  {
    id: "savvy-traveler",
    name: "The Savvy Traveler",
    description: "You build smart, balanced plans that feel elevated without wasting time.",
    summary: "You like experiences that earn their place in the day, with strong payoff, smooth pacing, and enough polish to feel worth the effort.",
    accent: "#0EA5E9",
    accentSoft: "#E0F2FE",
    traits: ["Efficient", "Strategic", "Polished"],
    bestFor: ["smart city routes", "high-return reservations", "balanced itineraries"],
    suggestedCategories: ["City Guides", "Standout Dining", "Well-Planned Mixes"],
    cityVibe: "Best in neighborhoods where great experiences sit close together and the day flows easily."
  }
];
