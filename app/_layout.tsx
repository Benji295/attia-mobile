import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AttiaProvider } from "../lib/store";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AttiaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </AttiaProvider>
    </SafeAreaProvider>
  );
}
