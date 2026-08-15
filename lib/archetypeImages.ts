import type { ImageSourcePropType } from "react-native";
import type { PersonalityId } from "../types";

/**
 * Archetype card imagery (OAT-102/OAT-103), one per archetype.
 *
 * Written out longhand because Metro resolves `require` STATICALLY: a computed
 * `require(`../assets/archetypes/${id}.jpg`)` compiles but bundles nothing and
 * fails at runtime. The Record<PersonalityId, …> type is what keeps this honest
 * — add an archetype to data/personalities.ts and this stops compiling until
 * its image is added here too.
 */
export const archetypeImages: Record<PersonalityId, ImageSourcePropType> = {
  socialite: require("../assets/archetypes/socialite.jpg"),
  explorer: require("../assets/archetypes/explorer.jpg"),
  connoisseur: require("../assets/archetypes/connoisseur.jpg"),
  connector: require("../assets/archetypes/connector.jpg"),
  "culture-vulture": require("../assets/archetypes/culture-vulture.jpg"),
  epicurean: require("../assets/archetypes/epicurean.jpg"),
  "adrenaline-junkie": require("../assets/archetypes/adrenaline-junkie.jpg"),
  "savvy-traveler": require("../assets/archetypes/savvy-traveler.jpg")
};
