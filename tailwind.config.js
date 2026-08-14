const { color, radius, font, screen } = require("./lib/tokens");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // ATTIA dark design system (OAT-90). Values are NOT written here — they
      // come from lib/tokens.js, which app code also reads through lib/theme.ts,
      // so the palette exists exactly once. Archetype accents live with the
      // archetypes, in data/personalities.ts.
      colors: color,
      borderRadius: radius,
      // Bricolage ships as STATIC weights, so a weight is a family, not a
      // font-weight utility: use font-display / font-display-medium /
      // font-display-semibold. `font-medium` cannot reach the Medium face.
      fontFamily: {
        display: [font.regular],
        "display-medium": [font.medium],
        "display-semibold": [font.semibold]
      },
      // Screen padding: 64px clears the status bar, 22 sides, 30 bottom.
      spacing: {
        "screen-top": screen.top,
        "screen-x": screen.x,
        "screen-bottom": screen.bottom
      }
    }
  },
  plugins: []
};
