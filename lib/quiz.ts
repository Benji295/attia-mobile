export type QuizOption = { label: string; key: string };
export type QuizQuestion = { q: string; options: QuizOption[] };

// Starter set. Replace with the ported `data/quiz` once shapes are reconciled.
export const QUIZ: QuizQuestion[] = [
  {
    q: "Your ideal trip kicks off with…",
    options: [
      { label: "A rooftop party with new faces", key: "socialite" },
      { label: "A trail map and no plan", key: "explorer" },
      { label: "A table I booked weeks ago", key: "connoisseur" },
      { label: "Meeting up with an old friend", key: "connector" },
    ],
  },
  {
    q: "What pulls you into a new city?",
    options: [
      { label: "The food. Always the food.", key: "epicurean" },
      { label: "Museums, history, culture", key: "culture_vulture" },
      { label: "Something that gets my heart racing", key: "adrenaline" },
      { label: "The smart, well-priced finds", key: "savvy" },
    ],
  },
  {
    q: "Pick a Saturday.",
    options: [
      { label: "Hosting supper for ten", key: "socialite" },
      { label: "A spontaneous road trip", key: "explorer" },
      { label: "A tasting menu + natural wine", key: "epicurean" },
      { label: "A gallery opening", key: "culture_vulture" },
    ],
  },
  {
    q: "Budget's tight-ish. You…",
    options: [
      { label: "Hunt down the hidden-gem deal", key: "savvy" },
      { label: "Splurge on one unforgettable thing", key: "connoisseur" },
      { label: "Cliff jump — it's free", key: "adrenaline" },
      { label: "Rally friends to split a villa", key: "connector" },
    ],
  },
];
