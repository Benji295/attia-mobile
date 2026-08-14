import { ScrollView, View, Text, Pressable } from "react-native";
import { color } from "../lib/theme";

// Filter dimensions, each backed by a real Activity field:
//   vibe → Activity.vibe, budget → priceLevel, setting → setting, dayPart → dayPart.
export type FilterDim = "vibe" | "budget" | "setting" | "dayPart";
export type Filters = Record<FilterDim, string>;

export const DEFAULT_FILTERS: Filters = { vibe: "All", budget: "All", setting: "All", dayPart: "All" };

const GROUPS: { dim: FilterDim; label: string; options: string[] }[] = [
  {
    dim: "vibe",
    label: "Vibe",
    options: ["All", "Social", "Curated", "Cultural", "Food-First", "Outdoorsy", "Relaxed", "High-Energy"]
  },
  { dim: "budget", label: "Budget", options: ["All", "$", "$$", "$$$"] },
  { dim: "setting", label: "Setting", options: ["All", "Indoors", "Outdoors"] },
  { dim: "dayPart", label: "When", options: ["All", "Day", "Night"] }
];

// Compact, horizontally-scrollable chip row (rounded pills, dark selected state —
// same styling as the city selector). One row, grouped by dimension.
export function DiscoverFilters({
  filters,
  onChange
}: {
  filters: Filters;
  onChange: (dim: FilterDim, value: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, alignItems: "center", paddingRight: 8 }}
    >
      {GROUPS.map((g, gi) => (
        <View key={g.dim} className="flex-row items-center" style={{ gap: 6 }}>
          {gi > 0 && (
            <View style={{ width: 1, height: 16, backgroundColor: color.rule, marginHorizontal: 2 }} />
          )}
          <Text
            className="font-display-semibold text-dim uppercase"
            style={{ fontSize: 10, letterSpacing: 10 * 0.2 }}
          >
            {g.label}
          </Text>
          {g.options.map((opt) => {
            const selected = filters[g.dim] === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => onChange(g.dim, opt)}
                className="rounded-pill border active:opacity-80"
                style={{
                  paddingHorizontal: 13,
                  paddingVertical: 7,
                  backgroundColor: selected ? color.text : "transparent",
                  borderColor: selected ? color.text : color.line
                }}
              >
                <Text
                  className="font-display"
                  style={{ fontSize: 12, color: selected ? color.bg : color.muted }}
                >
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}
