import { QuizQuestion } from "../types";

export const quizQuestions: QuizQuestion[] = [
  {
    id: "q1",
    prompt: "Your ideal Saturday starts with...",
    helper: "Pick the vibe that feels most like you.",
    options: [
      { id: "q1o1", label: "A rooftop brunch with the group chat", weights: { socialite: 3, connector: 1 } },
      { id: "q1o2", label: "A walking route through a neighborhood you have not explored", weights: { explorer: 3, "savvy-traveler": 1 } },
      { id: "q1o3", label: "Reservations at a beautifully designed cafe", weights: { connoisseur: 3, epicurean: 1 } },
      { id: "q1o4", label: "Coffee and a deep catch-up with one close friend", weights: { connector: 3, socialite: 1 } },
      { id: "q1o5", label: "A museum opening or local gallery show", weights: { "culture-vulture": 3, connoisseur: 1 } },
      { id: "q1o6", label: "A long tasting menu or market crawl", weights: { epicurean: 3, explorer: 1 } },
      { id: "q1o7", label: "An early workout or something with an adrenaline hit", weights: { "adrenaline-junkie": 3 } },
      { id: "q1o8", label: "A perfectly mapped day with zero wasted motion", weights: { "savvy-traveler": 3, connoisseur: 1 } }
    ]
  },
  {
    id: "q2",
    prompt: "When choosing a city plan, what matters most?",
    helper: "Go with your instinct.",
    options: [
      { id: "q2o1", label: "Where the fun crowd is heading", weights: { socialite: 3 } },
      { id: "q2o2", label: "Finding places tourists miss", weights: { explorer: 3 } },
      { id: "q2o3", label: "Taste and aesthetic quality", weights: { connoisseur: 3 } },
      { id: "q2o4", label: "Who I will share it with", weights: { connector: 3 } },
      { id: "q2o5", label: "Creative energy and local expression", weights: { "culture-vulture": 3 } },
      { id: "q2o6", label: "Food and sensory payoff", weights: { epicurean: 3 } },
      { id: "q2o7", label: "Challenge and excitement", weights: { "adrenaline-junkie": 3 } },
      { id: "q2o8", label: "A smooth, high-value itinerary", weights: { "savvy-traveler": 3 } }
    ]
  },
  {
    id: "q3",
    prompt: "A perfect night out feels...",
    helper: "Choose the one you would actually text a friend about.",
    options: [
      { id: "q3o1", label: "Buzzing, social, and a little chaotic", weights: { socialite: 3 } },
      { id: "q3o2", label: "Unexpected and full of turns", weights: { explorer: 3 } },
      { id: "q3o3", label: "Elegant and well curated", weights: { connoisseur: 3 } },
      { id: "q3o4", label: "Meaningful and full of conversation", weights: { connector: 3 } },
      { id: "q3o5", label: "Artful and culturally alive", weights: { "culture-vulture": 3 } },
      { id: "q3o6", label: "Delicious with amazing ambiance", weights: { epicurean: 3 } },
      { id: "q3o7", label: "Wild enough to make a story", weights: { "adrenaline-junkie": 3 } },
      { id: "q3o8", label: "Worth every dollar and every minute", weights: { "savvy-traveler": 3 } }
    ]
  },
  {
    id: "q4",
    prompt: "Pick the souvenir you would most likely bring home.",
    helper: "Small clues say a lot.",
    options: [
      { id: "q4o1", label: "Photos with everyone in them", weights: { socialite: 3 } },
      { id: "q4o2", label: "A weird local find from a side street shop", weights: { explorer: 3 } },
      { id: "q4o3", label: "A beautifully packaged specialty item", weights: { connoisseur: 3 } },
      { id: "q4o4", label: "Something thoughtful for someone else", weights: { connector: 3 } },
      { id: "q4o5", label: "A print, zine, or artist-made object", weights: { "culture-vulture": 3 } },
      { id: "q4o6", label: "A spice blend or food memory", weights: { epicurean: 3 } },
      { id: "q4o7", label: "A video from the moment I almost screamed", weights: { "adrenaline-junkie": 3 } },
      { id: "q4o8", label: "A compact keepsake that fits my carry-on", weights: { "savvy-traveler": 3 } }
    ]
  },
  {
    id: "q5",
    prompt: "Your group has one free afternoon. You suggest...",
    helper: "Think like the planner in the room.",
    options: [
      { id: "q5o1", label: "A social spot where you can bounce between plans", weights: { socialite: 3 } },
      { id: "q5o2", label: "A neighborhood crawl with no strict schedule", weights: { explorer: 3 } },
      { id: "q5o3", label: "One exceptional experience done right", weights: { connoisseur: 3 } },
      { id: "q5o4", label: "Something everyone can enjoy together", weights: { connector: 3 } },
      { id: "q5o5", label: "A live show, exhibit, or performance", weights: { "culture-vulture": 3 } },
      { id: "q5o6", label: "A food-forward agenda", weights: { epicurean: 3 } },
      { id: "q5o7", label: "Kayaks, climbing, or speed", weights: { "adrenaline-junkie": 3 } },
      { id: "q5o8", label: "The route with the best effort-to-reward ratio", weights: { "savvy-traveler": 3 } }
    ]
  },
  {
    id: "q6",
    prompt: "What makes a place feel worth recommending?",
    helper: "What would make you send the link?",
    options: [
      { id: "q6o1", label: "Everyone will have fun there", weights: { socialite: 2, connector: 1 } },
      { id: "q6o2", label: "It feels discovered, not served to me", weights: { explorer: 3 } },
      { id: "q6o3", label: "You can feel the quality immediately", weights: { connoisseur: 3 } },
      { id: "q6o4", label: "It creates real moments between people", weights: { connector: 3 } },
      { id: "q6o5", label: "It says something about the city’s identity", weights: { "culture-vulture": 3 } },
      { id: "q6o6", label: "It tastes or smells amazing", weights: { epicurean: 3 } },
      { id: "q6o7", label: "It gets my heart rate up", weights: { "adrenaline-junkie": 3 } },
      { id: "q6o8", label: "It is memorable and logistically smart", weights: { "savvy-traveler": 3 } }
    ]
  },
  {
    id: "q7",
    prompt: "Your travel style is best described as...",
    helper: "Choose your natural default.",
    options: [
      { id: "q7o1", label: "I go where the energy is", weights: { socialite: 3 } },
      { id: "q7o2", label: "I wander first, plan second", weights: { explorer: 3 } },
      { id: "q7o3", label: "I edit for quality over quantity", weights: { connoisseur: 3 } },
      { id: "q7o4", label: "I center people and connection", weights: { connector: 3 } },
      { id: "q7o5", label: "I want a creative pulse", weights: { "culture-vulture": 3 } },
      { id: "q7o6", label: "I travel through taste", weights: { epicurean: 3 } },
      { id: "q7o7", label: "I need movement and action", weights: { "adrenaline-junkie": 3 } },
      { id: "q7o8", label: "I optimize the whole trip", weights: { "savvy-traveler": 3 } }
    ]
  },
  {
    id: "q8",
    prompt: "Which queue would you willingly stand in?",
    helper: "Only one.",
    options: [
      { id: "q8o1", label: "The hottest opening night in town", weights: { socialite: 3 } },
      { id: "q8o2", label: "A tucked-away local institution", weights: { explorer: 3 } },
      { id: "q8o3", label: "A chef or maker with serious craft", weights: { connoisseur: 3 } },
      { id: "q8o4", label: "A spot my favorite people would love", weights: { connector: 3 } },
      { id: "q8o5", label: "A limited-run cultural event", weights: { "culture-vulture": 3 } },
      { id: "q8o6", label: "The city’s most talked-about bite", weights: { epicurean: 3 } },
      { id: "q8o7", label: "A launch point for something intense", weights: { "adrenaline-junkie": 3 } },
      { id: "q8o8", label: "Whatever is actually worth the wait", weights: { "savvy-traveler": 3 } }
    ]
  },
  {
    id: "q9",
    prompt: "What is your ideal pace?",
    helper: "Not your aspirational self. Your real self.",
    options: [
      { id: "q9o1", label: "Fast, social, and packed", weights: { socialite: 3 } },
      { id: "q9o2", label: "Fluid with room to detour", weights: { explorer: 3 } },
      { id: "q9o3", label: "Measured, polished, and intentional", weights: { connoisseur: 3 } },
      { id: "q9o4", label: "Balanced around the group", weights: { connector: 3 } },
      { id: "q9o5", label: "Driven by what is happening culturally", weights: { "culture-vulture": 3 } },
      { id: "q9o6", label: "Slow enough to savor", weights: { epicurean: 3 } },
      { id: "q9o7", label: "High-intensity with breaks later", weights: { "adrenaline-junkie": 3 } },
      { id: "q9o8", label: "Efficient with premium moments", weights: { "savvy-traveler": 3 } }
    ]
  },
  {
    id: "q10",
    prompt: "Which invitation gets an instant yes?",
    helper: "Assume your calendar is open.",
    options: [
      { id: "q10o1", label: "A new lounge with a lively crowd", weights: { socialite: 3 } },
      { id: "q10o2", label: "A secret spot someone just tipped me off to", weights: { explorer: 3 } },
      { id: "q10o3", label: "A beautifully executed dining experience", weights: { connoisseur: 3 } },
      { id: "q10o4", label: "A low-pressure plan with people I love", weights: { connector: 3 } },
      { id: "q10o5", label: "A documentary screening and panel", weights: { "culture-vulture": 3 } },
      { id: "q10o6", label: "A chef-led tasting or wine flight", weights: { epicurean: 3 } },
      { id: "q10o7", label: "Jet skis, zip lines, or a race track", weights: { "adrenaline-junkie": 3 } },
      { id: "q10o8", label: "A reservation that makes the day click into place", weights: { "savvy-traveler": 3 } }
    ]
  },
  {
    id: "q11",
    prompt: "You are happiest when an experience feels...",
    helper: "Finish the sentence honestly.",
    options: [
      { id: "q11o1", label: "Electric", weights: { socialite: 3 } },
      { id: "q11o2", label: "Uncharted", weights: { explorer: 3 } },
      { id: "q11o3", label: "Exquisite", weights: { connoisseur: 3 } },
      { id: "q11o4", label: "Shared", weights: { connector: 3 } },
      { id: "q11o5", label: "Expressive", weights: { "culture-vulture": 3 } },
      { id: "q11o6", label: "Delicious", weights: { epicurean: 3 } },
      { id: "q11o7", label: "Intense", weights: { "adrenaline-junkie": 3 } },
      { id: "q11o8", label: "Worth it", weights: { "savvy-traveler": 3 } }
    ]
  },
  {
    id: "q12",
    prompt: "Which role do you naturally play in a group plan?",
    helper: "No overthinking.",
    options: [
      { id: "q12o1", label: "The vibe starter", weights: { socialite: 3 } },
      { id: "q12o2", label: "The scout", weights: { explorer: 3 } },
      { id: "q12o3", label: "The curator", weights: { connoisseur: 3 } },
      { id: "q12o4", label: "The glue", weights: { connector: 3 } },
      { id: "q12o5", label: "The tastemaker", weights: { "culture-vulture": 3 } },
      { id: "q12o6", label: "The food lead", weights: { epicurean: 3 } },
      { id: "q12o7", label: "The one pushing for the bold option", weights: { "adrenaline-junkie": 3 } },
      { id: "q12o8", label: "The planner", weights: { "savvy-traveler": 3 } }
    ]
  },
  {
    id: "q13",
    prompt: "Pick the caption you would most likely post.",
    helper: "Shortest route to your taste.",
    options: [
      { id: "q13o1", label: "Best night with the best people", weights: { socialite: 3 } },
      { id: "q13o2", label: "Found this by accident and now I am obsessed", weights: { explorer: 3 } },
      { id: "q13o3", label: "Every detail was perfect", weights: { connoisseur: 3 } },
      { id: "q13o4", label: "Core memory", weights: { connector: 3 } },
      { id: "q13o5", label: "This city knows how to make art feel alive", weights: { "culture-vulture": 3 } },
      { id: "q13o6", label: "Still thinking about that meal", weights: { epicurean: 3 } },
      { id: "q13o7", label: "Would absolutely do that again", weights: { "adrenaline-junkie": 3 } },
      { id: "q13o8", label: "Perfect stop, zero regrets", weights: { "savvy-traveler": 3 } }
    ]
  },
  {
    id: "q14",
    prompt: "What makes you trust a recommendation?",
    helper: "Choose the thing that wins you over fastest.",
    options: [
      { id: "q14o1", label: "People are genuinely excited about it", weights: { socialite: 3 } },
      { id: "q14o2", label: "It feels off the beaten path", weights: { explorer: 3 } },
      { id: "q14o3", label: "It has a strong point of view", weights: { connoisseur: 3 } },
      { id: "q14o4", label: "It sounds great for my people", weights: { connector: 3 } },
      { id: "q14o5", label: "It is rooted in the local scene", weights: { "culture-vulture": 3 } },
      { id: "q14o6", label: "It promises a sensory payoff", weights: { epicurean: 3 } },
      { id: "q14o7", label: "It sounds thrilling", weights: { "adrenaline-junkie": 3 } },
      { id: "q14o8", label: "It clearly earns its place in the plan", weights: { "savvy-traveler": 3 } }
    ]
  },
  {
    id: "q15",
    prompt: "Which ending feels most satisfying?",
    helper: "Close the loop with your instinct.",
    options: [
      { id: "q15o1", label: "One more round because the night is still alive", weights: { socialite: 3 } },
      { id: "q15o2", label: "A final detour just to see what happens", weights: { explorer: 3 } },
      { id: "q15o3", label: "A last perfect detail", weights: { connoisseur: 3 } },
      { id: "q15o4", label: "A conversation that lingers after", weights: { connector: 3 } },
      { id: "q15o5", label: "A moment that makes the city feel bigger", weights: { "culture-vulture": 3 } },
      { id: "q15o6", label: "Dessert and a slow walk home", weights: { epicurean: 3 } },
      { id: "q15o7", label: "That rush where you feel fully alive", weights: { "adrenaline-junkie": 3 } },
      { id: "q15o8", label: "Knowing the day landed exactly right", weights: { "savvy-traveler": 3 } }
    ]
  }
];
