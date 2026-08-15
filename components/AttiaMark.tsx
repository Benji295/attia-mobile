import Svg, { Circle, Path } from "react-native-svg";
import { color } from "../lib/theme";

/**
 * The ATTIA mark (OAT-99) — two arcs under an orb.
 *
 * Paths are inlined from assets/brand/attia-mark.svg rather than imported from
 * it: React Native has no native SVG import, and three paths do not justify an
 * SVG transformer dependency. The .svg remains the source of record — if it
 * changes, these change with it.
 *
 * The orb takes a COLOUR PROP rather than deciding for itself. It defaults to
 * brand orange; a caller that knows the user's archetype passes
 * getPersonalityProfile(result.dominant).accent, so a returning user's mark
 * glows in their own colour. The component stays dumb; the screen decides.
 */
export function AttiaMark({
  size = 46,
  orbColor = color.brand,
}: {
  size?: number;
  /** Defaults to brand orange. Pass an archetype accent where one is known. */
  orbColor?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path
        d="M98 256 A158 158 0 0 0 414 256"
        fill="none"
        stroke={color.text}
        strokeWidth={15}
        strokeLinecap="round"
      />
      <Path
        d="M158 217 A98 98 0 0 0 354 217"
        fill="none"
        stroke={color.text}
        strokeWidth={10}
        strokeLinecap="round"
        opacity={0.45}
      />
      <Circle cx={256} cy={148} r={44} fill={orbColor} />
    </Svg>
  );
}
