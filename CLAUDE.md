# CLAUDE.md — ATTIA Mobile

> Native iOS + Android app for ATTIA, built with Expo. This file is the ground truth for every Claude Code session. Keep it short and current.

## What ATTIA is
Personality-based travel recommendation app. A quiz sorts users into one of **8 travel archetypes**, then matches them to real activities in pilot cities.

- **Archetypes:** Socialite, Explorer, Connoisseur, Connector, Culture Vulture, Epicurean, Adrenaline Junkie, Savvy Traveler
- **Pilot cities:** Washington DC, New York City
- **Tagline:** "Your ATTIA awaits."
- **North star:** the Aura Design Guide / Aura Design Specifications. When in doubt, defer to the specs.

## Tech stack
- **Expo** (React Native) + **Expo Router** (file-based routing under `app/`)
- **TypeScript** (strict)
- **NativeWind** for styling (Tailwind syntax in RN)
- **EAS Build / Submit** for store builds
- **pnpm** as package manager (requires `.npmrc` → `node-linker=hoisted`)
- **Google Places API** for live activity data

## Commands
- Install: `pnpm install`
- Dev server: `pnpm expo start`
- iOS sim: `pnpm expo run:ios`
- Android emulator: `pnpm expo run:android`
- Typecheck: `pnpm tsc --noEmit`
- Lint: `pnpm lint`
- Cloud build (preview): `eas build --profile preview --platform all`
- Submit to stores: `eas submit --platform ios|android`

## Project layout
- `app/` — Expo Router screens (file = route). Tabs live here.
- `components/` — reusable UI (RN primitives, NativeWind)
- `data/` — activities, cities, personalities, quiz (ported from web; pure data, do not rewrite logic)
- `lib/scoring/` — personality + activity match engine
- `lib/places/` — Google Places client + geolocation
- `lib/analytics/` — event tracking
- `types/` — shared TS types

## Design system (do not drift from this)
- **Font:** Bricolage Grotesque
- **Palette — LOCKED (OAT-2).** Single source of truth: core tokens in `tailwind.config.js` (`theme.extend.colors`), per-archetype accents in `data/personalities.ts`. Never hardcode these per-screen.

  **Core (neutral skeleton):**
  | token | hex | use |
  |-------|-----|-----|
  | `ink` | `#171717` | primary text + CTAs (≈ `neutral-900`) |
  | `surface` | `#FFFFFF` | cards, backgrounds |
  | `mist` | `#E5E5E5` | borders, dividers (≈ `neutral-200`) |
  | `brand` | `#FB923C` | sunset warmth — splash, logo, accents; **NOT** the default CTA |

  **Personality accents (by id):** socialite `#EC4899` · explorer `#10B981` · connoisseur `#8B5CF6` · connector `#3B82F6` · culture-vulture `#F97316` · epicurean `#F59E0B` · adrenaline-junkie `#EF4444` · savvy-traveler `#06B6D4`. Each also carries an `accentSoft` (~100-level tint) for chip/wash backgrounds.
- CTAs stay **ink** (`neutral-900`); brand orange is for warmth, not the default button color.
- Keep using Tailwind's `neutral-*` scale where it maps (ink ≈ `neutral-900`, mist ≈ `neutral-200`); the named tokens make `ink`/`brand` explicit.
- Tone is **dark and confident** — NOT pastel. The old web code was pastel; ignore it as a style reference.

## Mobile-first rules
- This is a phone app: thumb-reachable bottom tab nav (Discover / Saved / Itinerary / Profile)
- 44pt+ tap targets, no hover-dependent behavior
- Respect safe-area insets (notch / home indicator)
- Discover screen uses Tinder-style swipe + circular action buttons

## Known product priorities / gotchas
- **Scoring must produce a wide match spread.** A prior bug compressed matches into a narrow band (default scores for unspecified traits) and there were hardcoded overrides in `explainActivityMatch()` that bypassed real logic. Do not reintroduce either. The "magical match" is the core value prop.
- **Don't build gamification (XP/badges/streaks) without a stated hypothesis** for what behavior it drives.
- Analytics must measure the validation funnel: quiz completion, post-quiz sign-up, activity save rate.

## Conventions
- Prefer functional components + hooks; keep screens thin, push logic into `lib/`.
- Keep ported data/logic files framework-agnostic (no web/DOM, no RN-specific imports inside `data/` or `lib/scoring`).
- Conventional commits (`feat:`, `fix:`, `chore:`).
- Linear team **OAT** tracks all work — reference issue IDs (e.g. `OAT-1`) in branches/PRs.

## IMPORTANT — separate identity from BreakInvent
ATTIA is its own company/LLC, NOT a BreakInvent (BRE) project. Never reuse BreakInvent identifiers, credentials, or cloud resources.
- **Bundle ID / package name:** ATTIA-scoped (e.g. `com.attia.app`) — never `com.breakinvent.*`
- Its own **Expo project slug**, **EAS credentials**, **Google Cloud project + Places API key**, and (if used) **Firebase config**.
- Confirm the final bundle ID before first EAS build — it's painful to change later.
