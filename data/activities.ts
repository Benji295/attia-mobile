import { Activity } from "../types";

// SAMPLE Washington DC activities. Live Google Places data replaces these in a
// later task (OAT-5 / OAT-9); the shape matches the real `Activity` type so the
// scoring engine treats them identically. personalityScores are intentionally
// SPREAD — high for the archetypes an activity genuinely serves, low for the
// rest. Do NOT backfill unspecified traits with a mid-range default: that is the
// exact pattern that compressed matches into a narrow band (see CLAUDE.md).
export const activities: Activity[] = [
  {
    id: "dc-anacostia-kayak",
    title: "Sunset kayak on the Anacostia",
    category: "Water Activities",
    city: "washington-dc",
    neighborhood: "Navy Yard",
    priceLevel: "$$",
    vibe: "High-Energy",
    setting: "Outdoors",
    dayPart: "Day",
    idealTime: "Evening",
    image: "",
    descriptionShort: "Paddle the river as the skyline goes gold.",
    descriptionLong:
      "A guided sunset paddle from Navy Yard — open water, a little burn in the arms, and the city lighting up behind you.",
    personalityScores: {
      socialite: 22,
      explorer: 74,
      connoisseur: 10,
      connector: 24,
      "culture-vulture": 12,
      epicurean: 14,
      "adrenaline-junkie": 96,
      "savvy-traveler": 30
    },
    tags: ["outdoors", "active", "water"],
    lat: 38.8746,
    lng: -77.0019
  },
  {
    id: "dc-speakeasy-tasting",
    title: "Hidden speakeasy tasting",
    category: "Wine Bars",
    city: "washington-dc",
    neighborhood: "Shaw",
    priceLevel: "$$$",
    vibe: "Curated",
    setting: "Indoors",
    dayPart: "Night",
    idealTime: "Evening",
    image: "",
    descriptionShort: "An unmarked door and a flight worth finding.",
    descriptionLong:
      "Behind a Shaw storefront, a bartender-led tasting flight built around small-batch spirits and serious technique.",
    personalityScores: {
      socialite: 44,
      explorer: 26,
      connoisseur: 80,
      connector: 34,
      "culture-vulture": 22,
      epicurean: 94,
      "adrenaline-junkie": 10,
      "savvy-traveler": 30
    },
    tags: ["drinks", "intimate", "craft"],
    lat: 38.9127,
    lng: -77.0219
  },
  {
    id: "dc-hirshhorn-after-hours",
    title: "After-hours at the Hirshhorn",
    category: "Art",
    city: "washington-dc",
    neighborhood: "National Mall",
    priceLevel: "$",
    vibe: "Cultural",
    setting: "Indoors",
    dayPart: "Night",
    idealTime: "Evening",
    image: "",
    descriptionShort: "Modern art, after dark, minus the crowds.",
    descriptionLong:
      "An evening run of the Hirshhorn's contemporary galleries — quiet rooms, bold work, and time to actually look.",
    personalityScores: {
      socialite: 30,
      explorer: 40,
      connoisseur: 62,
      connector: 28,
      "culture-vulture": 96,
      epicurean: 18,
      "adrenaline-junkie": 10,
      "savvy-traveler": 34
    },
    tags: ["culture", "art", "evening"],
    lat: 38.8877,
    lng: -77.0229
  },
  {
    id: "dc-ustreet-rooftop",
    title: "U Street rooftop social",
    category: "Rooftops",
    city: "washington-dc",
    neighborhood: "U Street",
    priceLevel: "$$",
    vibe: "Social",
    setting: "Outdoors",
    dayPart: "Night",
    idealTime: "Evening",
    image: "",
    descriptionShort: "A lively rooftop where the night builds itself.",
    descriptionLong:
      "A buzzing U Street rooftop with a moving crowd, a good list, and the kind of energy you text people to come join.",
    personalityScores: {
      socialite: 96,
      explorer: 26,
      connoisseur: 28,
      connector: 58,
      "culture-vulture": 30,
      epicurean: 38,
      "adrenaline-junkie": 22,
      "savvy-traveler": 24
    },
    tags: ["nightlife", "social", "rooftop"],
    lat: 38.917,
    lng: -77.0282
  },
  {
    id: "dc-chefs-counter",
    title: "Chef's counter tasting menu",
    category: "Dining",
    city: "washington-dc",
    neighborhood: "Penn Quarter",
    priceLevel: "$$$",
    vibe: "Curated",
    setting: "Indoors",
    dayPart: "Night",
    idealTime: "Evening",
    image: "",
    descriptionShort: "A seat at the pass for a precise, course-by-course menu.",
    descriptionLong:
      "Front-row at the kitchen for a multi-course tasting — every plate considered, every detail intentional.",
    personalityScores: {
      socialite: 30,
      explorer: 18,
      connoisseur: 95,
      connector: 36,
      "culture-vulture": 26,
      epicurean: 82,
      "adrenaline-junkie": 8,
      "savvy-traveler": 40
    },
    tags: ["dining", "craft", "refined"],
    lat: 38.8951,
    lng: -77.0214
  },
  {
    id: "dc-eastern-market-crawl",
    title: "Eastern Market food crawl",
    category: "Food Tours",
    city: "washington-dc",
    neighborhood: "Capitol Hill",
    priceLevel: "$$",
    vibe: "Food-First",
    setting: "Indoors",
    dayPart: "Day",
    idealTime: "Morning",
    image: "",
    descriptionShort: "Graze the market stalls with a local lead.",
    descriptionLong:
      "A morning crawl through Eastern Market — vendors, samples, and the side streets the line-skippers know.",
    personalityScores: {
      socialite: 40,
      explorer: 66,
      connoisseur: 38,
      connector: 60,
      "culture-vulture": 34,
      epicurean: 88,
      "adrenaline-junkie": 14,
      "savvy-traveler": 44
    },
    tags: ["food", "market", "local"],
    lat: 38.8869,
    lng: -76.9956
  },
  {
    id: "dc-georgetown-paddle-bike",
    title: "Georgetown waterfront paddle + bike",
    category: "Outdoor Sports",
    city: "washington-dc",
    neighborhood: "Georgetown",
    priceLevel: "$$",
    vibe: "Outdoorsy",
    setting: "Outdoors",
    dayPart: "Day",
    idealTime: "Afternoon",
    image: "",
    descriptionShort: "Paddle the Potomac, then ride the towpath.",
    descriptionLong:
      "A half-day combo on the Georgetown waterfront — a paddle leg, then a towpath ride out toward the canal.",
    personalityScores: {
      socialite: 26,
      explorer: 86,
      connoisseur: 14,
      connector: 30,
      "culture-vulture": 16,
      epicurean: 20,
      "adrenaline-junkie": 78,
      "savvy-traveler": 50
    },
    tags: ["outdoors", "active", "explore"],
    lat: 38.9019,
    lng: -77.0653
  },
  {
    id: "dc-supper-club",
    title: "Candlelit supper club, 12 seats",
    category: "Shared Tables",
    city: "washington-dc",
    neighborhood: "Logan Circle",
    priceLevel: "$$$",
    vibe: "Relaxed",
    setting: "Indoors",
    dayPart: "Night",
    idealTime: "Evening",
    image: "",
    descriptionShort: "One long table, twelve seats, a slow evening.",
    descriptionLong:
      "A hosted supper club for twelve — shared courses, real conversation, and the kind of night that lingers.",
    personalityScores: {
      socialite: 62,
      explorer: 24,
      connoisseur: 40,
      connector: 95,
      "culture-vulture": 30,
      epicurean: 52,
      "adrenaline-junkie": 8,
      "savvy-traveler": 30
    },
    tags: ["intimate", "dinner", "people"],
    lat: 38.9095,
    lng: -77.0301
  },
  {
    id: "dc-monuments-smart-route",
    title: "Smart half-day monuments route",
    category: "City Guides",
    city: "washington-dc",
    neighborhood: "National Mall",
    priceLevel: "$",
    vibe: "Curated",
    setting: "Outdoors",
    dayPart: "Day",
    idealTime: "Morning",
    image: "",
    descriptionShort: "Maximum monuments, minimum wasted steps.",
    descriptionLong:
      "An optimized walking loop of the Mall's headline monuments — best light, fewest crowds, no backtracking.",
    personalityScores: {
      socialite: 26,
      explorer: 52,
      connoisseur: 36,
      connector: 30,
      "culture-vulture": 48,
      epicurean: 20,
      "adrenaline-junkie": 14,
      "savvy-traveler": 95
    },
    tags: ["efficient", "sightseeing", "walking"],
    lat: 38.8893,
    lng: -77.0502
  },
  {
    id: "dc-gallery-opening-live-set",
    title: "Indie gallery opening + live set",
    category: "Performance",
    city: "washington-dc",
    neighborhood: "Union Market",
    priceLevel: "$$",
    vibe: "Cultural",
    setting: "Indoors",
    dayPart: "Night",
    idealTime: "Evening",
    image: "",
    descriptionShort: "An opening night with a live set in the back room.",
    descriptionLong:
      "A new-work opening near Union Market, paired with a live music set — the city's creative scene, mid-conversation.",
    personalityScores: {
      socialite: 54,
      explorer: 38,
      connoisseur: 56,
      connector: 40,
      "culture-vulture": 92,
      epicurean: 28,
      "adrenaline-junkie": 12,
      "savvy-traveler": 26
    },
    tags: ["culture", "music", "scene"],
    lat: 38.9088,
    lng: -76.9971
  }
];
