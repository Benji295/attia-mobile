import { ScrollView, View, Text, Pressable } from "react-native";

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
          {gi > 0 && <View style={{ width: 1, height: 16, backgroundColor: "#E5E5E5", marginHorizontal: 2 }} />}
          <Text className="text-[11px] uppercase text-neutral-400" style={{ letterSpacing: 0.5 }}>
            {g.label}
          </Text>
          {g.options.map((opt) => {
            const selected = filters[g.dim] === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => onChange(g.dim, opt)}
                className={`rounded-full px-3 py-1.5 border active:opacity-80 ${
                  selected ? "bg-neutral-900 border-neutral-900" : "bg-white border-neutral-200"
                }`}
              >
                <Text className={`text-xs font-medium ${selected ? "text-white" : "text-neutral-600"}`}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}
