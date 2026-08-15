export const personalityIds = [
  "socialite",
  "explorer",
  "connoisseur",
  "connector",
  "culture-vulture",
  "epicurean",
  "adrenaline-junkie",
  "savvy-traveler"
] as const;

export type PersonalityId = (typeof personalityIds)[number];

export type PersonalityProfile = {
  id: PersonalityId;
  name: string;
  description: string;
  summary: string;
  /**
   * Blend-sentence clauses (OAT-102). `dominantClause` reads as this archetype
   * leading ("you plan carefully"); `secondaryClause` reads as it following
   * ("then want the room to be full"). Combined in lib/blend.ts.
   */
  dominantClause: string;
  secondaryClause: string;
  /** Archetype color — the single source of truth (see data/personalities.ts). */
  accent: string;
  /**
   * @deprecated Light-palette wash from OAT-2, retained only until the screens
   * that still consume it go dark in their own slices. The dark system washes
   * with an alpha on `accent` instead — withAlpha(accent, "wash") in lib/theme.
   */
  accentSoft: string;
  traits: string[];
  bestFor: string[];
  suggestedCategories: string[];
  cityVibe: string;
};

export type PersonalityWeights = Record<PersonalityId, number>;

export type QuizOption = {
  id: string;
  label: string;
  weights: Partial<PersonalityWeights>;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  helper: string;
  options: QuizOption[];
};

export type City = {
  id: string;
  name: string;
  state: string;
  tagline: string;
};

export type Activity = {
  id: string;
  title: string;
  category: string;
  city: string;
  neighborhood: string;
  priceLevel: "$" | "$$" | "$$$";
  vibe: "Social" | "Curated" | "Cultural" | "Outdoorsy" | "Food-First" | "High-Energy" | "Relaxed";
  setting: "Indoors" | "Outdoors";
  dayPart: "Day" | "Night";
  idealTime: "Morning" | "Afternoon" | "Evening";
  image: string;
  descriptionShort: string;
  descriptionLong: string;
  personalityScores: PersonalityWeights;
  tags: string[];
  lat: number;
  lng: number;
};

export type QuizResult = {
  dominant: PersonalityId;
  secondary: PersonalityId[];
  scores: PersonalityWeights;
};

export type ItineraryDay = "day1" | "day2" | "day3";

export type ItineraryItem = {
  id: string;
  activityId: string;
  day: ItineraryDay;
  time: string;
  timeLabel: "Morning" | "Afternoon" | "Evening";
};

export type RankedActivity = {
  activity: Activity;
  match: number;
  explanation: string;
  traitLabels: string[];
};
