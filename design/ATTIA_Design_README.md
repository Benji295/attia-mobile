# Handoff: ATTIA — merged mobile app

## Overview

ATTIA is a personality-first travel app. A 15-question quiz sorts the user into one of eight travel archetypes, then every recommendation in the app is ranked against that archetype for the specific trip they are planning. This bundle covers the full first-run flow and all five main tabs.

**ATTIA** — Authentic Travel Tailored In Advance. The name reads like a person and nods to the Arabic *Atiyah*, meaning gift. Tagline: "Your ATTIA awaits."

This design merges two existing repos:
- `Benji295/attia` — older Next.js web prototype. More visual depth, richer Saved/Itinerary screens.
- `Benji295/attia-mobile` — newer Expo/React Native app. Better logic, Google Places integration, real tester feedback.

The merge rule the team chose: **mobile repo's logic wins, best screen wins on UI, case by case.** Visual direction is the dark "vision mockup" direction, not the white palette currently shipping in attia-mobile.

## About the design files

The files in this bundle are **design references created in HTML**. They are prototypes showing intended look and behavior — not production code to lift directly.

The task is to **recreate these designs inside `Benji295/attia-mobile`**, which is an Expo / React Native app using expo-router and NativeWind. Use that codebase's existing patterns: file-based routes under `app/`, the `lib/store.tsx` context for state, NativeWind classes for styling, Ionicons for tab icons.

Do not port the HTML. Read it for layout, spacing, color, type and behavior, then build the equivalent React Native screens.

Two important notes on the existing code:
- The scoring engine, quiz data, personality data and activity seed already exist in `attia-mobile`. Reuse them. The prototype reimplements them only because it runs standalone in a browser.
- The prototype's local state is a browser `localStorage` blob. The real app already has `lib/store.tsx` writing to AsyncStorage under `attia:v1`. Extend that, don't replace it.

## Fidelity

**High fidelity.** Final colors, typography, spacing and interactions. Recreate pixel-faithfully using React Native primitives and NativeWind, adapting only where a native pattern is clearly better (e.g. native modal presentation for the place detail sheet, native date picker for trip dates).

Two exceptions, both deliberately unfinished:
- **Imagery** is represented by drop-target placeholders on the welcome screen and place detail. Real photography is pending (OAT-71). Place photos should come from the Google Places photo API.
- **NYC activity data** is authored placeholder content in the same shape as the DC seed. Google Places is the real source.

---

## Screens / views

The flow is linear until the app shell: **Welcome → How it works (optional) → Quiz → Reveal → Trip setup → tabbed app.**

### 1. Welcome

**Purpose:** First impression. Explain what ATTIA is and start the quiz.

**Layout:** Full-bleed dark screen, `padding: 64px 22px 30px`, column flex.
- Hero image block: height 196px, `border-radius: 26px`, 1px border `#24242B`, overflow hidden. Bottom-anchored scrim over it: `linear-gradient(180deg, rgba(13,13,15,.15) 0%, rgba(13,13,15,.55) 60%, #0D0D0F 100%)`.
- Brand block, pulled up over the image by `margin-top: -34px`, centered:
  - Sparkle icon, 30×30, stroke `#FF9F45`, stroke-width 1.6
  - Wordmark "ATTIA" — 56px / line-height 1, weight 500, letter-spacing `.02em`, color `#F4F1EC`
  - Expansion, two lines, 16px, weight 500, uppercase, letter-spacing `.26em`, line-height 1.55, base color `#E9E4DC`:
    "AUTHENTIC TRAVEL" / "TAILORED IN ADVANCE"
  - "*Atiyah* — gift" — 13px, color `#7C7986`, the word Atiyah italic in `#97949E`
  - "Your ATTIA awaits." — 17px, color `#FF9F45`
- Spacer, then two stacked buttons at the bottom:
  - Primary "Take the quiz" — full width, `background: #F4F1EC`, text `#0D0D0F`, 17px padding, `border-radius: 18px`, 15.5px weight 500. Hover `#fff`.
  - Ghost "How it works" — no border, text `#7C7986`, 13.5px. Hover `#F4F1EC`.

**Animation on the expansion lines** (see Interactions): staggered rise-in on mount, plus a slow recurring color warm on the words "Travel" and "In Advance".

### 2. How it works

**Purpose:** Explain the three-step model before committing to the quiz.

**Layout:** Back button top-left (40×40 circle, `background:#16161A`, 1px `#24242B`, arrow-left icon). Title "How ATTIA works" at 34px/1.12, weight 500, letter-spacing `-.01em`. Then three cards in a 12px gap grid.

**Card:** 1px border `#24242B`, `background:#16161A`, `border-radius:22px`, `padding:20px`.
- Step number "01"/"02"/"03" — 10px, weight 600, letter-spacing `.22em`, color `#FF9F45`
- Heading — 17px/1.25, weight 500, `#F4F1EC`
- Body — 13px/1.6, `#97949E`

Copy, verbatim:
1. **Answer 15 quick questions** — "Tap the one that fits. If two fit equally, rank up to three — the scoring handles blends."
2. **Meet your archetype** — "One of eight, with the secondary traits that shade it. Every recommendation traces back to this."
3. **Set your trip, then build the days** — "Tell us where and when. Everything you see is scoped to that trip — saves included."

Bottom: primary "Start the quiz" button, same spec as welcome's primary.

### 3. Quiz

**Purpose:** Collect 15 answers to compute the archetype. This screen resolves a documented conflict between OAT-53 (Hinge-style single-tap auto-advance) and OAT-54 (ranked multi-select) with a hybrid.

**Layout:**
- Top row: back button (40×40 circle), progress bar (flex 1, height 6, `border-radius:999px`, track `#1D1D22`, fill is the user's current dominant archetype accent, `transition: width .3s`), counter "n/15" at 12px weight 500 `#7C7986`.
- Question — 29px/1.2, weight 500, letter-spacing `-.015em`, `text-wrap: pretty`
- Helper line — 13.5px, `#97949E`. Reads "Choose one." in single mode, "Rank up to three, best first." in ranked mode.
- 8 option buttons, 8px gap grid, full width.
- Bottom row: mode toggle + conditional Continue button.

**Option button:** `border-radius:16px`, `padding:15px`, 14px/1.35 text, flex row with 11px gap, `transition: border-color .18s`.
- Rest: 1px `#24242B`, `background:#16161A`, text `#D6D2DA`
- Selected: 1px archetype accent, `background:#17161C`, text `#F4F1EC`
- Hover: border `#4A4A55`
- In ranked mode a selected option shows a rank badge: 20×20 circle, archetype accent background, `#0D0D0F` text, 11px weight 600, showing 1, 2 or 3.

**Mode toggle:** 1px `#24242B`, no fill, `border-radius:14px`, `padding:13px 16px`, 12.5px, `#97949E`. Label is "Pick more" in single mode, "One answer" in ranked mode. Full width in single mode; shrinks to auto when Continue appears.

**Continue button:** only rendered in ranked mode with ≥1 pick. Flex 1, `background:#F4F1EC`, text `#0D0D0F`, `border-radius:14px`, `padding:13px`, 13.5px weight 500.

### 4. Reveal

**Purpose:** Deliver the archetype with enough weight to feel earned (OAT-67).

**Layout:**
- A radial glow bleeds from the top of the screen, absolutely positioned, height 300px, non-interactive: `radial-gradient(120% 90% at 50% 0%, <accent>26 0%, transparent 62%)`
- Eyebrow "YOU ARE" — 10px, weight 600, letter-spacing `.24em`, uppercase, `#7C7986`
- Archetype name — 42px/1.05, weight 500, letter-spacing `-.02em`, **colored in the archetype's accent**
- Summary — 16px/1.6, `#C9C5CE`, `text-wrap: pretty`
- Trait pills — `border-radius:999px`, `padding:7px 13px`, 12px, 1px border in `<accent>44`, text in accent
- **Spectrum card** — 1px `#24242B`, `background:#16161A`, `border-radius:22px`, `padding:20px`. Eyebrow "YOUR SPECTRUM". Then all eight archetypes sorted descending by score, each a row of: name (13px; weight 500 + `#F4F1EC` if dominant, else weight 400 + `#97949E`), right-aligned percentage (11px, `#6E6B78`), and a 5px bar below (track `#1D1D22`, fill the archetype's accent at full opacity if dominant, `66` alpha otherwise), width = score normalized against the top score.
- City-vibe card — same card chrome, single 13.5px/1.65 line in `#97949E`
- Primary "Plan a trip" → trip setup. Secondary "Retake quiz" — 1px `#24242B`, transparent, `#97949E`.

### 5. Trip setup

**Purpose:** Establish the trip object (OAT-63). This is the structural change that scopes the rest of the app.

**Layout:** Title "Where are you going?" 32px/1.15 weight 500. Sub: "Everything after this is scoped to the trip — picks, saves, and the days you build."

Four labeled sections, each with a 10px/`.2em` uppercase `#7C7986` eyebrow:
- **CITY** — three full-width cards, 8px gap. Card is `border-radius:18px`, `padding:16px`, column with 6px gap: name 16px/1.2 weight 500, note 12px/1.4 `#7C7986`. Selected: 1px accent border + `background:#17161C`. Unselected: 1px `#24242B` + `#16161A`.
- **WHEN** — pill row: "This weekend", "Next weekend", "In a month"
- **HOW LONG** — pill row: "2 days", "3 days"
- **YOUR NAME** — text input, full width, 1px `#24242B`, `background:#16161A`, `border-radius:16px`, `padding:15px 16px`, 15px text `#F4F1EC`, placeholder "So the app can greet you". Focus state: border `#FF9F45`.

Bottom primary button, label is dynamic: "Start planning {City}".

**Pill spec (used throughout):** `border-radius:999px`, `padding:9px 15px`, 12.5px. Selected: 1px `#F4F1EC` border, `background:#F4F1EC`, text `#0D0D0F`. Unselected: 1px `#24242B`, transparent, text `#97949E`.

Real implementation should use a native date picker rather than the three canned "when" options — those exist to keep the prototype self-contained.

### 6. Home tab

**Purpose:** Personalized entry point (OAT-73).

- Greeting — 14px `#7C7986`. Time-based: "Morning"/"Afternoon"/"Evening", plus ", {name}" when a name was given.
- Headline — 27px/1.18 weight 500, letter-spacing `-.015em`: "Your {Archetype short name} picks for {City}"
- **Trip card** — 1px `#24242B`, `#16161A`, `border-radius:24px`, `padding:20px`. Eyebrow "YOUR TRIP", city name 22px/1.15 weight 500, "{when} · {n} days" 13px `#97949E`. Top-right "Change" pill → trip setup. Below a 1px `#1D1D22` divider: three inline stats (18px gap) — saved count, scheduled count, level — each a 19px weight 500 value over an 11px `#7C7986` label.
- Eyebrow "PICKED FOR YOU", then the top 3 ranked activity cards.
- **Insider block** — locked below level 2: dashed 1px `#2F2F38`, `border-radius:20px`, lock icon, "Insider picks unlock at Lv 2" + explanation. Unlocked at Lv 2+: 1px `#3A2E1F`, `background:#1A140C`, orange eyebrow "INSIDER PICK UNLOCKED", the 4th-ranked activity title, and a note.

### 7. Discover tab

**Purpose:** Browse everything in the trip city, ranked.

- Title "Discover" 30px/1.15 weight 500. Sub "{City} · ranked for {Archetype}".
- **Filter chip row** — horizontally scrollable, no visible scrollbar, 8px gap, 22px side padding. Four filter dimensions: vibe (Social, Curated, Cultural, Food-First, Outdoorsy, Relaxed, High-Energy), budget ($, $$, $$$), setting (Indoors, Outdoors), when (Day, Night). When a dimension has an active value, a "× {dimension}" clear chip appears for it. Pill spec as above.
- **Activity card** (list version) — 1px `#24242B`, `#16161A`, `border-radius:22px`, overflow hidden. A 3px full-width stripe in the activity's accent color runs along the top. Body `padding:16px 17px 13px`: tier badge, title 18px/1.22 weight 500, blurb 13px/1.5 `#97949E`, meta 11.5px `#6E6B78` reading "{hood} · {category} · {price}". Footer row `padding: 0 17px 15px`, 7px gap, two buttons: Save/Saved and "+ Day {n}" quick-add.
  - Save button rest: 1px `#24242B`, transparent, `#97949E`. Saved: 1px `#FF9F45`, `background:#1A140C`, text `#FF9F45`.
- Empty state: "Nothing matches those filters. Loosen one." centered, 13px `#6E6B78`.

**Tier badge (OAT-46)** — `border-radius:999px`, `padding:5px 10px`, 9.5px weight 600, letter-spacing `.12em`, uppercase. "Top match" uses `<accent>22` background with accent text; all other tiers use `#1D1D22` with `#7C7986` text.

### 8. Place detail (overlay)

**Purpose:** OAT-44. Full-screen overlay, not a route change — z-index 80, covers the tab bar.

- Photo area 250px with a top-to-bottom scrim: `linear-gradient(180deg, rgba(13,13,15,.35) 0%, rgba(13,13,15,.1) 45%, #0D0D0F 100%)`. Close button top-left at `top:58px; left:18px`, 38×38 circle, `background: rgba(13,13,15,.72)`, backdrop blur 10px.
- Content pulled up `margin-top:-30px`: tier badge, title 30px/1.15 weight 500, meta 12.5px `#7C7986` ("{hood} · {category} · {price} · {setting}"), long description 14.5px/1.65 `#C9C5CE`.
- **"Why it fits you" card** — 1px `#24242B`, `border-radius:20px`, `padding:18px`, background `linear-gradient(150deg, <accent>14 0%, #16161A 60%)`. Eyebrow, then an explanation naming which archetype the place scores highest with and whether that is the user's dominant or secondary trait. Below it, in `#5A5764` 11.5px, the raw score line — deliberately de-emphasized.
- Tag pills — 1px `#24242B`, `border-radius:999px`, `padding:7px 13px`, 11.5px `#97949E`.
- "ADD TO A DAY" eyebrow + a row of Day pills, flex 1 each.
- Fixed footer, 1px `#1D1D22` top border, `padding:14px 22px 30px`: single wide Save button. Unsaved: `background:#F4F1EC`, text `#0D0D0F`, label "Save to this trip". Saved: 1px `#FF9F45`, `background:#1A140C`, text `#FF9F45`, label "Saved to this trip".

### 9. Saved tab

**Purpose:** Trip-scoped saves. Fixes OAT-61 — saves used to leak across cities.

- Title "Saved", sub "{City} · this trip only".
- List of saved activity cards (compact variant: 3px vertical accent bar on the left instead of a top stripe, title + meta only).
- Empty state: "Nothing saved for this trip yet." / "Heart something in Discover."
- **Cross-trip notice** — shown only when saves exist under other cities. 1px `#24242B`, `border-radius:18px`, info icon, 12.5px `#7C7986`: "{n} places are saved under your other trips. Saves stay with the city they were found in — they never leak across trips."

### 10. Itinerary tab

**Purpose:** Per-day planning (OAT-21, redesigned per OAT-69).

- Title "Itinerary", sub "{City} · {n} days".
- Day tab pills — "Day 1", "Day 2", "Day 3" (count follows the trip length).
- **Overload warning** — appears when 2+ sit-down meals land in one evening. 1px `#3A2A1F`, `background:#1A120C`, `border-radius:16px`, warning triangle in `#FF9F45`, text 12.5px `#D8C7B4`: "{n} sit-down meals are stacked in one evening. Move one to Afternoon, or push it to another day." This addresses tester feedback C-11.
- **Three time slots** — Morning (10:00), Afternoon (13:30), Evening (19:00). Each has a header row: slot label (10px, `.2em`, uppercase, `#7C7986`), time (11px `#4F4C58`), then a 1px `#1D1D22` rule filling the remaining width.
- Scheduled item card: 1px `#24242B`, `#16161A`, `border-radius:18px`, `padding:14px`, 3px accent bar on the left (stretched full height), title 15px/1.25, meta 11.5px `#7C7986`, and a 30×30 remove button (× icon, `#5A5764`, hover `#F4F1EC`).
- Empty slot: dashed 1px `#26262E`, `border-radius:16px`, centered "Open" in 12px `#4F4C58`.

### 11. Profile tab

**Purpose:** Identity and progress. Every number is earned — no fabricated stats (OAT-14).

- **Hero card** — 1px `#24242B`, `border-radius:24px`, `padding:22px 20px`, background `linear-gradient(160deg, <accent>1F 0%, #16161A 58%)`. Eyebrow "PROFILE", name 28px/1.15 weight 500 (falls back to "Your profile"), archetype name 13.5px in the accent color. Then an XP row: "Lv {n}" + "{n} XP to next", and a 6px progress bar (track `#1D1D22`, fill the accent).
- **Stat grid** — 2×2, 10px gap. Card: 1px `#24242B`, `#16161A`, `border-radius:20px`, `padding:17px`. Value 24px weight 500, label 11.5px/1.3 `#7C7986`. Stats: Saved this trip, Scheduled stops, Cities explored, XP earned.
- **Badges** — 8px gap list. Earned: 1px `#33323C`, `background:#16161A`, name in `#F4F1EC`, right-side mark "EARNED" in `#FF9F45`. Locked: 1px `#24242B`, transparent, name `#5A5764`, mark "LOCKED" in `#4F4C58`. Note line 11.5px `#6E6B78`.
  - Perfect match — see a place scoring 75 or higher
  - Full day — schedule three stops in one day
  - City hopper — save places in two different cities
  - Insider — reach Lv 2 to unlock off-feed picks
- Reset button at the bottom — 1px `#24242B`, transparent, `#5A5764`.

### Tab bar

Fixed bottom, `padding: 9px 8px 30px`, 1px `#1D1D22` top border, `background: rgba(13,13,15,.96)` with an 18px backdrop blur. Five equal columns: Home, Discover, Saved, Itinerary, Profile. Each is a column flex, 5px gap, 19×19 stroke icon (stroke-width 1.7) over a 10px label. Active `#F4F1EC`, inactive `#5A5764`.

In `attia-mobile` this is expo-router's `<Tabs>` with Ionicons — keep that, just restyle.

---

## Interactions & behavior

**Welcome animations.** Two named keyframes:
- `attia-rise` — `from { opacity: 0; transform: translateY(9px) } to { opacity: 1; transform: translateY(0) }`, `.9s cubic-bezier(.2,.7,.3,1) both`. Applied to each expansion line, second delayed `.12s`.
- `attia-warm` — `0%,70%,100% { color: #E9E4DC } 18%,52% { color: #FF9F45 }`, `7s ease-in-out infinite`. Applied to the words "Travel" and "In Advance", the second offset by `.35s`.

In React Native use Reanimated: a shared timing value driving `translateY` + `opacity` for the rise, and an interpolated color loop for the warm.

**Quiz mode switching.** Single-tap mode: tapping an option immediately commits it as a one-element ranking and advances. Ranked mode: taps accumulate into a draft array (max 3), tapping again removes, and nothing commits until Continue. Switching modes clears the draft. This separation matters — an earlier build wrote picks straight into the answers object, which made the second tap advance the question instead of ranking.

**Back.** On question 1 back returns to Welcome. Otherwise it deletes the previous answer and steps back, so re-answering is possible.

**Quick-add.** The "+ Day {n}" button on a Discover card adds the activity to the currently selected itinerary day and navigates to the Itinerary tab. It slots the activity into its natural time slot (each activity carries a preferred slot).

**Save toggle.** Saving records `{ id, city }`. The Saved tab filters to the current trip city. This is the whole fix for OAT-61 — the save is scoped at write time, not at read time.

**Detail overlay.** Opens over the tab bar. Adding to a day from the overlay closes it and jumps to the Itinerary tab on that day.

**Transitions.** Only two, both cheap: `border-color .18s` on option/card hover, `width .3s` on the progress and XP bars.

## State management

Prototype state shape (mirror this into `lib/store.tsx`):

```
screen        "welcome" | "how" | "quiz" | "reveal" | "trip" | "app"
tab           "home" | "discover" | "saved" | "itinerary" | "profile"
answers       { [questionId]: number[] }   // ranked option indices, best first
draft         number[]                     // uncommitted ranked picks
multi         boolean                      // ranked mode on/off
result        { dominant, secondary[], scores } | null
name          string
trip          { city, when, days } | null
saved         [{ id, city }]
plan          [{ id, day, slot, city }]
day           number                       // selected itinerary day
detail        activityId | null
filters       { vibe, budget, setting, when }
```

Persisted on every mutation. The prototype writes a `localStorage` blob under `attia-merged-v1`; the real app already persists to AsyncStorage under `attia:v1` — extend that record rather than adding a second store. `screen`, `draft`, `multi` and `detail` are transient and should not persist mid-quiz.

**Scoring.** Ranked answers are weighted `[1, 0.6, 0.3]` by position. Each option carries a weight map over archetype ids; the weighted sum across all 15 questions produces the score vector. Dominant is the top-scoring archetype, secondaries are ranks 2 and 3.

**Match percentage.** For an activity, normalize the user's score vector to sum 1, then take the dot product with the activity's own 8-way score vector. Clamp to 52–99 so nothing reads as a total mismatch.

**Tiers (OAT-46).** ≥82 "Top match", ≥72 "Strong fit", ≥63 "Good fit", below "Worth a look". Tier labels are what users see; the raw percentage appears only in the detail view's why-card. Testers found bare percentages discouraging (C-16), but the number is still logged.

**XP.** `50` for completing the quiz, `10` per save, `30` bonus at 3+ saves, `5` per scheduled stop. Level is `floor(xp / 100) + 1`. Level 2 unlocks Insider picks — one off-feed activity per city. This is the payoff answer to OAT-80, which flagged that streaks and XP had no consequence; treat it as a proposal, not a settled decision.

## Design tokens

**Color**

| Token | Hex | Use |
|---|---|---|
| Background | `#0D0D0F` | App background |
| Surface | `#16161A` | Cards, inputs, controls |
| Surface raised | `#17161C` | Selected card/option fill |
| Line | `#24242B` | Default border |
| Line strong | `#33323C` | Earned-badge border |
| Line hover | `#4A4A55` | Hover border |
| Rule | `#1D1D22` | Dividers, progress track |
| Text | `#F4F1EC` | Primary text, primary button fill |
| Text warm | `#E9E4DC` | Tagline at rest |
| Text body | `#C9C5CE` / `#D6D2DA` | Long-form body |
| Muted | `#97949E` | Secondary text |
| Dim | `#7C7986` | Labels, eyebrows |
| Faint | `#6E6B78` / `#5A5764` / `#4F4C58` | Meta, disabled |
| Brand orange | `#FF9F45` | Accents, saved state, unlocks |
| Orange tint bg | `#1A140C` | Saved / unlocked fill |
| Orange tint border | `#3A2E1F` | Unlocked border |
| Warn bg / border | `#1A120C` / `#3A2A1F` | Itinerary overload warning |
| Warn text | `#D8C7B4` | Warning copy |

Brand orange is `#FF9F45`, brightened from the `#F26B0F` locked in OAT-2 for the shipping white palette. The darker orange does not carry enough contrast on `#0D0D0F`. If OAT-2's palette is truly locked, this needs a decision.

**Archetype accents** — each archetype owns one color, used for its reveal headline, spectrum bar, progress fill, and the accent stripe on any activity it scores highest with.

| Archetype | Accent |
|---|---|
| The Socialite | `#FB7185` |
| The Explorer | `#22D3EE` |
| The Connoisseur | `#A78BFA` |
| The Connector | `#2DD4BF` |
| The Culture Vulture | `#C084FC` |
| The Epicurean | `#FBBF24` |
| The Adrenaline Junkie | `#F87171` |
| The Savvy Traveler | `#38BDF8` |

Alpha suffixes used on hex: `14` and `1F` for gradient washes, `22` for the top-match badge fill, `26` for the reveal glow, `44` for trait pill borders, `66` for non-dominant spectrum bars.

**Typography** — Bricolage Grotesque throughout, weights 400 and 500 (600 for small uppercase eyebrows).

| Role | Size / line-height | Weight | Tracking |
|---|---|---|---|
| Wordmark | 56 / 1 | 500 | `.02em` |
| Reveal name | 42 / 1.05 | 500 | `-.02em` |
| Screen title | 30–34 / 1.15 | 500 | `-.015em` |
| Detail title | 30 / 1.15 | 500 | `-.015em` |
| Question | 29 / 1.2 | 500 | `-.015em` |
| Home headline | 27 / 1.18 | 500 | `-.015em` |
| Card title (lg) | 18 / 1.22 | 500 | — |
| Card title | 15–17 / 1.25 | 500 | — |
| Body | 13–14.5 / 1.6 | 400 | — |
| Meta | 11.5–12.5 | 400 | — |
| Eyebrow | 10 | 600 | `.2em`–`.24em`, uppercase |
| Tier badge | 9.5 | 600 | `.12em`, uppercase |
| Tagline | 16 / 1.55 | 500 | `.26em`, uppercase |

**Radius** — 999 pills · 26 hero image · 24 hero cards · 22 standard cards · 20 secondary cards · 18 list items and buttons · 16 options and inputs · 14 small buttons · 13 card footer buttons

**Spacing** — screen padding `64px 22px 30px` (64 clears the status bar). Card padding 20 (large) / 16–17 (standard) / 14–15 (compact). Grid gaps 7–14. Section rhythm: 26–28 above an eyebrow, 12–13 below it.

**Shadow** — none. Depth comes from 1px borders and surface lift. Do not add shadows.

## Assets

- **Welcome hero** — placeholder drop target. Needs real photography (OAT-71).
- **Place photos** — placeholder drop target. Source from the Google Places photo API; the mapping already exists in `lib/places/`.
- **Icons** — inline 24×24 stroke SVGs in the prototype (stroke-width 1.7–2, round caps and joins). In the app use Ionicons, already wired in `app/(tabs)/_layout.tsx`.
- **Font** — Bricolage Grotesque via Google Fonts in the prototype. `expo-font` in the app. OAT-2 marks it locked, but `app/index.tsx` still renders system type — worth confirming it actually loads.
- **Not usable:** `assets/images/logo-glow.png` and `assets/images/tabIcons/` in attia-mobile are Expo starter leftovers (a blue radial glow, and 2 of 5 tab icons). ATTIA has no logo asset yet.

## Activity data

The prototype carries 16 activities — the 10 DC entries from `attia-mobile/data/activities.ts` plus 6 NYC entries authored in the same shape. Each: `{ id, title, category, city, hood, price, vibe, setting, when, slot, short, long, tags[], s }` where `s` is an 8-way score map over archetype ids (8–96).

This is seed data. Google Places is the real source. The score map is the part that has no Places equivalent — it needs either a curation pass or a derivation from Places categories and attributes. That is an open product question, not a design one.

## Files

- `ATTIA Merged.dc.html` — the design. All screens, states and interactions.
- `ATTIA Mobile.dc.html` — earlier baseline rebuilt from the older web repo, in that repo's light palette. Reference only; superseded.
- `ios-frame.jsx`, `image-slot.js` — prototype scaffolding (device bezel, image drop targets). Not part of the design.

Open either HTML file directly in a browser. Both are self-contained and clickable end to end. The prototype exposes three switches for jumping around: start screen, forced archetype, and raw-percent vs tier labels.

## Linear tickets covered

OAT-63 trip object · OAT-53 + OAT-54 quiz hybrid · OAT-67 reveal · OAT-44 place detail · OAT-46 tier labels · OAT-21 + OAT-69 itinerary · OAT-61 save scoping · OAT-73 greeting · OAT-71 welcome imagery (slot only) · OAT-80 XP payoff (proposal) · OAT-14 no fabricated stats · C-11 evening overload warning · C-16 tier over percentage

Not covered: OAT-88 Supabase migration and everything backend. The prototype persists locally only.
