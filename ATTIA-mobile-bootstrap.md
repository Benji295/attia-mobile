# ATTIA Mobile — Bootstrap Runbook

Stand up the native Expo app and start OAT-1. Run these on your Mac (not in chat). Fresh repo `attia-mobile`; keep `Benji295/attia` as the logic/spec reference.

> **Decisions to lock before you start**
> - Bundle ID / package: **`com.attia.app`** (confirm — hard to change after first EAS build; must NOT be `com.breakinvent.*`)
> - New **Google Cloud project + Places API key** scoped to ATTIA (don't reuse BreakInvent's)
> - Your own **Expo account/org** (not BreakInvent's)
> - GitHub repo: **`Benji295/attia-mobile`** (private)

---

## Phase 0 — prereqs (one-time)
```bash
node -v            # want Node 20 LTS+
pnpm -v
npm i -g eas-cli   # EAS CLI for builds
# iOS sim needs Xcode (App Store). Android emulator needs Android Studio.
```

## Phase 1 — scaffold the project
```bash
cd ~/Desktop
pnpm create expo-app@latest attia-mobile     # TypeScript + Expo Router template
cd attia-mobile
npm run reset-project                          # press n -> deletes demo, clean app/ structure

# pnpm + Expo: required, or installs break
printf "node-linker=hoisted\n" > .npmrc
pnpm install
```

## Phase 2 — NativeWind (Tailwind in RN)
```bash
npx expo install nativewind react-native-reanimated react-native-safe-area-context
pnpm add -D tailwindcss@^3.4.17 prettier-plugin-tailwindcss babel-preset-expo
npx tailwindcss init
```

**tailwind.config.js**
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // ATTIA tokens go here once the palette is locked (OAT-2). Placeholder:
      colors: { brand: "#FB923C" },
    },
  },
  plugins: [],
};
```

**global.css**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**babel.config.js**
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

**metro.config.js**
```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css", inlineRem: 16 });
```

**nativewind-env.d.ts**
```ts
/// <reference types="nativewind/types" />
```

## Phase 3 — identity & config (separate from BreakInvent)
Edit **app.json** (or convert to `app.config.ts`):
```jsonc
{
  "expo": {
    "name": "ATTIA",
    "slug": "attia",
    "scheme": "attia",
    "ios": { "bundleIdentifier": "com.attia.app", "supportsTablet": false },
    "android": { "package": "com.attia.app" },
    "extra": { "placesApiKey": "set-via-eas-secret-not-here" }
  }
}
```
```bash
eas init                 # creates a NEW Expo project under YOUR account (own slug)
eas build:configure      # generates eas.json (dev/preview/production profiles)
# store the Places key as a secret, never in git:
eas env:create --name PLACES_API_KEY --value "<your-new-attia-places-key>" --environment development
```

## Phase 4 — port the brains from `Benji295/attia`
```bash
# from ~/Desktop with both repos present:
cp -R ../attia-repo/data        ./data
cp -R ../attia-repo/types       ./types
mkdir -p lib
cp -R ../attia-repo/lib/scoring   ./lib/scoring
cp -R ../attia-repo/lib/places    ./lib/places
cp -R ../attia-repo/lib/analytics ./lib/analytics
cp    ../attia-repo/lib/store.ts  ./lib/store.ts 2>/dev/null || true
```
Then: `pnpm tsc --noEmit` and fix breakages — strip any `next/*`, DOM, or web-only imports. `data/` and `lib/scoring` should be pure TS with zero platform imports. The Places client may need `fetch`/env tweaks for RN.

## Phase 5 — OAT-1 tab skeleton
**app/_layout.tsx** (root: safe area + global styles)
```tsx
import "../global.css";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
```

**app/(tabs)/_layout.tsx** (bottom nav)
```tsx
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="saved" options={{ title: "Saved" }} />
      <Tabs.Screen name="itinerary" options={{ title: "Itinerary" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
```
Create stub screens `app/(tabs)/discover.tsx`, `saved.tsx`, `itinerary.tsx`, `profile.tsx`, each a `<View><Text className="...">` placeholder. Verify `className` works (NativeWind wired correctly).

## Phase 6 — wire git + ship the skeleton
```bash
# drop the updated CLAUDE.md at repo root first, then:
git init && git add . && git commit -m "chore: scaffold ATTIA Expo app + OAT-1 shell"
gh repo create attia-mobile --private --source=. --remote=origin --push
git branch -M main && git push -u origin main
```

## Run it
```bash
pnpm expo start            # scan QR in Expo Go, or:
pnpm expo run:ios          # needs Xcode
pnpm expo run:android      # needs Android Studio
```

---

## Maps to the board
- **Phase 1–6** = OAT-1 (mobile-first foundation)
- Palette tokens in `tailwind.config.js` = OAT-2 (after the meeting locks the colors)
- Ported `lib/scoring` = where OAT-3 lives
- Ported `lib/analytics` = OAT-6
