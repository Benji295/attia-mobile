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
  accent: string;
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
