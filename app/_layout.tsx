import "../global.css";
import { useEffect, type ReactNode } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PostHogProvider } from "posthog-react-native";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
// Per-weight entry points, not the package index: the index re-exports all seven
// weights, and Metro then bundles every one of them — 368K of faces the app
// never renders. These three imports ship only what the design system uses.
import { BricolageGrotesque_400Regular } from "@expo-google-fonts/bricolage-grotesque/400Regular";
import { BricolageGrotesque_500Medium } from "@expo-google-fonts/bricolage-grotesque/500Medium";
import { BricolageGrotesque_600SemiBold } from "@expo-google-fonts/bricolage-grotesque/600SemiBold";
import { color } from "../lib/theme";
import { AttiaProvider } from "../lib/store";
import { posthog } from "../lib/analytics";

// Hold the splash until Bricolage is ready, so no frame renders in system type
// (OAT-90). OAT-2 marked the font locked but never shipped loading code — this
// is where it actually gets loaded.
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Wraps in PostHogProvider only when a client exists. */
function MaybePostHog({ children }: { children: ReactNode }) {
  if (!posthog) return <>{children}</>;
  return (
    <PostHogProvider client={posthog} autocapture={false}>
      {children}
    </PostHogProvider>
  );
}

export default function RootLayout() {
  // The package ships static weights, so each weight is its own family. See
  // lib/tokens.js `font` for how these map to the font-display-* classes.
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold
  });

  useEffect(() => {
    // Hide on error too — a missing font must not leave the user on a splash
    // screen forever; the app falls back to system type instead.
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Explicit events only — autocapture off (screens/touches/lifecycle),
          session replay off (in the client options). The provider is skipped
          entirely when there is no client (development, or a misconfigured
          non-dev build) — see lib/analyticsEnv. */}
      <MaybePostHog>
        <SafeAreaProvider>
          <AttiaProvider>
            {/* Light glyphs: the app is dark now, so "dark" icons vanish. */}
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                // Stops a white flash between routes — the navigator's own
                // background is white by default.
                contentStyle: { backgroundColor: color.bg }
              }}
            />
          </AttiaProvider>
        </SafeAreaProvider>
      </MaybePostHog>
    </GestureHandlerRootView>
  );
}
