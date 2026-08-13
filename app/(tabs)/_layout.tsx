import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { font, tabBar } from "../../lib/theme";

// Dark tab bar (OAT-90). Values come from lib/tokens.js — nothing here is a
// hardcoded hex. The screens above it are still light; that is the expected
// intermediate state until each screen gets its own slice.
//
// Height is explicit because the spec fixes the bottom padding at 30 (clearing
// the home indicator) rather than deriving it from the safe-area inset, which
// is what the default tab bar does.
const TAB_BAR_HEIGHT =
  tabBar.paddingTop + tabBar.iconSize + tabBar.gap + 12 + tabBar.paddingBottom;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tabBar.active,
        tabBarInactiveTintColor: tabBar.inactive,
        tabBarStyle: {
          backgroundColor: tabBar.background,
          borderTopWidth: 1,
          borderTopColor: tabBar.borderTopColor,
          paddingTop: tabBar.paddingTop,
          paddingHorizontal: tabBar.paddingX,
          paddingBottom: tabBar.paddingBottom,
          height: TAB_BAR_HEIGHT,
          // No shadow: depth in this system is the 1px top border alone.
          elevation: 0
        },
        tabBarLabelStyle: {
          fontFamily: font.regular,
          fontSize: tabBar.labelSize,
          marginTop: tabBar.gap
        },
        tabBarIconStyle: { marginBottom: 0 }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" color={color} size={tabBar.iconSize} />
          )
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => (
            <Ionicons name="compass-outline" color={color} size={tabBar.iconSize} />
          )
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarIcon: ({ color }) => (
            <Ionicons name="heart-outline" color={color} size={tabBar.iconSize} />
          )
        }}
      />
      <Tabs.Screen
        name="itinerary"
        options={{
          title: "Itinerary",
          tabBarIcon: ({ color }) => (
            <Ionicons name="map-outline" color={color} size={tabBar.iconSize} />
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" color={color} size={tabBar.iconSize} />
          )
        }}
      />
    </Tabs>
  );
}
