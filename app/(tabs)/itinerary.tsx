import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Itinerary() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-white px-5" style={{ paddingTop: insets.top + 8 }}>
      <Text className="text-2xl font-medium text-neutral-900 mb-4">Itinerary</Text>
      <Text className="text-sm text-neutral-400 mt-8 text-center">Your trip plan will live here.</Text>
    </View>
  );
}
