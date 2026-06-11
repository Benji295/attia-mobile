import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PostHogProvider } from "posthog-react-native";
import { AttiaProvider } from "../lib/store";
import { posthog } from "../lib/analytics";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Explicit events only — autocapture off (screens/touches/lifecycle),
          session replay off (in the client options). */}
      <PostHogProvider client={posthog} autocapture={false}>
        <SafeAreaProvider>
          <AttiaProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
          </AttiaProvider>
        </SafeAreaProvider>
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}
