/**
 * ATTIA design tokens — the single source of truth for the dark system (OAT-90).
 *
 * Plain CommonJS on purpose: `tailwind.config.js` cannot import TypeScript, and
 * duplicating the palette into two files is exactly the drift this replaces.
 * Tailwind requires this file for the NativeWind theme; app code imports the
 * typed re-export in `lib/theme.ts`.
 *
 * Values come from design/ATTIA_Design_README.md + design/ATTIA_Merged_dc.html.
 * Archetype accents are NOT here — they live with the archetypes they belong to,
 * in data/personalities.ts.
 *
 * NO SHADOWS. Depth in this system is 1px borders plus surface lift.
 */

/** Core palette. */
const color = {
  // Ground
  bg: "#0D0D0F", // app background
  surface: "#16161A", // cards, inputs, controls
  "surface-raised": "#17161C", // selected card / option fill

  // Borders + rules
  line: "#24242B", // default border
  "line-strong": "#33323C", // earned-badge border
  "line-hover": "#4A4A55", // hover border (from the design README's token table)
  rule: "#1D1D22", // dividers, progress track

  // Type
  text: "#F4F1EC", // primary text, primary button fill
  "text-warm": "#E9E4DC", // tagline at rest
  body: "#C9C5CE", // long-form body
  "body-strong": "#D6D2DA", // long-form body, higher contrast
  muted: "#97949E", // secondary text
  dim: "#7C7986", // labels, eyebrows — lowest AA-passing tier (4.6:1)

  /**
   * Card meta lines and any de-emphasised score. Same value as `dim`, named
   * separately so the correct choice is the obvious one at the call site.
   *
   * DELIBERATE DEVIATION from design/: the prototype sets card meta to #6E6B78
   * and the detail why-card's raw score line to #5A5764, both of which fail
   * WCAG AA on #0D0D0F. OAT-90 §5 overrides them to #7C7986 (4.6:1). Reach for
   * `meta`, never `faint`, for anything a user is meant to read.
   *
   * SURFACE CAVEAT (measured in OAT-71): 4.56:1 holds against `bg`, but on a
   * `surface` card the same value is only 4.24:1 — under AA. A meta line
   * sitting on a card therefore uses `muted` (6.05:1 on surface); `meta` is for
   * meta text on the app background.
   */
  meta: "#7C7986",

  // Faint tier — BELOW WCAG AA on bg (#6E6B78 3.7:1, #5A5764 2.8:1, #4F4C58 2.3:1).
  // Legitimate for genuinely disabled/inert states ONLY: locked-badge marks,
  // empty-slot placeholders, the inactive tab label. Never for meta lines or a
  // de-emphasised score — those use `meta`. See OAT-90 §5.
  faint: "#6E6B78",
  "faint-2": "#5A5764",
  "faint-3": "#4F4C58",

  // Brand
  brand: "#FF9F45", // accents, saved state, unlocks
  "brand-tint-bg": "#1A140C", // saved / unlocked fill
  "brand-tint-border": "#3A2E1F", // unlocked border

  /**
   * Destructive actions ONLY — the Danger Zone label and its confirm (OAT-93).
   *
   * The system had no destructive colour: warn-* is a warm caution for the
   * itinerary overload, not destruction. This hex already existed as the
   * adrenaline-junkie accent, so it introduces no new hue, but it is named
   * separately on purpose — an archetype colour and a UI state must be free to
   * move independently. Never use an archetype accent to mean "danger".
   *
   * Moved off #F87171 in OAT-92: that hex IS the Adrenaline Junkie accent, so
   * one user in eight met the destructive action dressed in the colour of their
   * own identity. #EF4444 is no archetype's accent.
   * 5.16:1 on bg, 4.80:1 on surface — clears AA for body text.
   */
  danger: "#EF4444",

  // Warning (itinerary evening overload, C-11)
  "warn-bg": "#1A120C",
  "warn-border": "#3A2A1F",
  "warn-text": "#D8C7B4"
};

/** Radius ladder. Every rounded corner in the system is one of these. */
const radius = {
  pill: 999,
  hero: 26, // hero image
  "hero-card": 24, // hero cards
  card: 22, // standard cards
  secondary: 20, // secondary cards
  list: 18, // list items, buttons
  option: 16, // options, inputs
  small: 14, // small buttons
  footer: 13 // card footer buttons
};

/** Screen padding: 64px clears the status bar; 22 sides; 30 bottom. */
const screen = { top: 64, x: 22, bottom: 30 };

/**
 * Bricolage Grotesque, loaded from @expo-google-fonts/bricolage-grotesque.
 *
 * The package ships STATIC weights, not a variable font, so a weight is selected
 * by naming its family — `fontWeight: 500` cannot reach the Medium face. Use
 * these families (Tailwind: font-display / font-display-medium /
 * font-display-semibold), not the font-weight utilities.
 */
const font = {
  regular: "BricolageGrotesque_400Regular",
  medium: "BricolageGrotesque_500Medium",
  semibold: "BricolageGrotesque_600SemiBold" // 10px uppercase eyebrows
};

/** Tab bar (design README "Tab bar"; values read from the prototype markup). */
const tabBar = {
  paddingTop: 9,
  paddingX: 8,
  paddingBottom: 30,
  borderTopColor: color.rule,
  background: "rgba(13,13,15,0.96)",
  blur: 18,
  iconSize: 19,
  iconStrokeWidth: 1.7,
  labelSize: 10,
  gap: 5,
  active: color.text,
  inactive: color["faint-2"]
};

/**
 * Alpha suffixes the system uses on accent hexes. RN accepts #RRGGBBAA, so these
 * append directly — see withAlpha() in lib/theme.ts.
 */
const alpha = {
  wash: "14", // gradient wash (lighter)
  washStrong: "1F", // gradient wash (profile hero)
  badge: "22", // top-match badge fill
  glow: "26", // reveal radial glow
  pillBorder: "44", // trait pill border
  barMuted: "66" // non-dominant spectrum bar
};

module.exports = { color, radius, screen, font, tabBar, alpha };
