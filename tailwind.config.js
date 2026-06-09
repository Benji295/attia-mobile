/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // ATTIA core palette — LOCKED (OAT-2). Single source of truth for the
      // neutral skeleton + brand warmth. Per-personality accents live in
      // data/personalities.ts (the one place archetype colors are defined).
      colors: {
        ink: "#171717", // primary text + CTAs (≈ neutral-900)
        surface: "#FFFFFF", // cards, backgrounds
        mist: "#E5E5E5", // borders, dividers (≈ neutral-200)
        brand: "#FB923C", // sunset warmth: splash, logo, accents — NOT the default CTA
      },
    },
  },
  plugins: [],
};
