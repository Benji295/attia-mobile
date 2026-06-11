import { ScrollView, Text, Pressable } from "react-native";
import { CITIES } from "../lib/cities";
import { trackCitySelected } from "../lib/analytics";
import { useAttia } from "../lib/store";

// Compact pill row (rounded pills, dark selected state) matching the web's
// launch-cities look. Reads/writes the selected city in the store, so every
// screen that renders it stays in sync. Horizontally scrollable so the labels
// never clip on narrow devices.
export function CitySelector() {
  const { cityId, setCity } = useAttia();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {CITIES.map((c) => {
        const selected = c.id === cityId;
        return (
          <Pressable
            key={c.id}
            onPress={() => {
              if (c.id === cityId) return;
              setCity(c.id);
              trackCitySelected(c.id);
            }}
            className={`rounded-full px-4 py-2 border active:opacity-80 ${
              selected ? "bg-neutral-900 border-neutral-900" : "bg-white border-neutral-200"
            }`}
          >
            <Text className={`text-sm font-medium ${selected ? "text-white" : "text-neutral-600"}`}>
              {c.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
