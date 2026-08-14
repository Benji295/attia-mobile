import { ScrollView, Text, Pressable } from "react-native";
import { CITIES } from "../lib/cities";
import { trackCitySelected } from "../lib/analytics";
import { color } from "../lib/theme";
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
            className="rounded-pill border active:opacity-80"
            style={{
              paddingHorizontal: 15,
              paddingVertical: 9,
              backgroundColor: selected ? color.text : "transparent",
              borderColor: selected ? color.text : color.line
            }}
          >
            <Text
              className="font-display"
              style={{ fontSize: 12.5, color: selected ? color.bg : color.muted }}
            >
              {c.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
