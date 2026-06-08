/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // ATTIA palette tokens land here once the "Sunset Adventure" colors are
      // locked (OAT-2). Until then screens use neutral-* + per-archetype accents
      // from lib/personalities.ts. Do NOT invent a final palette here.
    },
  },
  plugins: [],
};
