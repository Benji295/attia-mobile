import { View, Text, Pressable, Animated, Easing, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Svg, { Path } from "react-native-svg";
import { color, screen } from "../lib/theme";
import { prefersReducedMotion } from "../lib/feedback";
import { useAttia } from "../lib/store";

// Welcome (OAT-71 / OAT-35 / OAT-38), rebuilt to design/ATTIA_Merged_dc.html.
//
// The 196px hero image the design puts above this block is deliberately absent:
// there is no photography in the repo and inventing one is worse than shipping
// without. The brand block is the top of the screen until OAT-71's imagery
// lands, at which point it regains its -34px overlap.

// Both animations use React Native's core Animated rather than Reanimated,
// which the rest of the app uses. Reanimated is right for gesture-driven work
// (Discover's swipe deck) but has two failure modes here that this screen —
// the first thing every tester sees — cannot afford, both observed in a real
// build: a shared value whose worklet runtime never ticks leaves the tagline at
// opacity 0, and an `entering` layout animation absolutely-positions its
// wrapper, collapsing the two lines on top of each other. Core Animated needs
// no worklet runtime and keeps the element in normal flow, so the worst case is
// simply that the text sits still.

// react-native-web has no native driver; asking for it there silently leaves the
// value at its initial state (observed: the tagline stuck at opacity 0).
const NATIVE_DRIVER = Platform.OS !== "web";

// attia-rise: opacity 0 -> 1, translateY 9 -> 0, .9s cubic-bezier(.2,.7,.3,1).
const RISE_MS = 900;
const RISE_EASING = Easing.bezier(0.2, 0.7, 0.3, 1);
const RISE_TRANSLATE = 9;

// attia-warm: 7s colour loop, keyframes 0/70/100 at rest and 18/52 warm.
const WARM_MS = 7000;
const WARM_STOPS = [0, 0.18, 0.52, 0.7, 1];
const WARM_COLORS = [
  color["text-warm"],
  color.brand,
  color.brand,
  color["text-warm"],
  color["text-warm"]
];

/** One expansion line. Rises on mount; the second is delayed .12s. */
function RiseLine({ delay, children }: { delay: number; children: ReactNode }) {
  const reduce = prefersReducedMotion();
  const t = useRef(new Animated.Value(reduce ? 1 : 0)).current;

  useEffect(() => {
    if (reduce) return;
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: RISE_MS,
      delay,
      easing: RISE_EASING,
      useNativeDriver: NATIVE_DRIVER
    });
    anim.start();

    // Safety net. This line carries the brand tagline on the first screen every
    // tester sees, and animating opacity up from 0 means ANY stall leaves it
    // invisible — which is exactly what a stalled driver did in testing. By the
    // time the animation should have finished, force the resting state: a no-op
    // if it played, a snap to visible if it never ran.
    const settle = setTimeout(() => t.setValue(1), delay + RISE_MS + 250);
    return () => {
      anim.stop();
      clearTimeout(settle);
    };
  }, [delay, reduce, t]);

  return (
    <Animated.View
      style={{
        opacity: t,
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [RISE_TRANSLATE, 0] }) }
        ]
      }}
    >
      {children}
    </Animated.View>
  );
}

/**
 * A word that slowly warms from #E9E4DC to brand orange and back, forever.
 * Under Reduce Motion it simply rests in brand orange — which is what the
 * prototype shows when its animation does not run.
 */
function WarmWord({ offset, children }: { offset: number; children: ReactNode }) {
  const reduce = prefersReducedMotion();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce) return;
    // Colour cannot run on the native driver, so this one drives from JS.
    const loop = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: WARM_MS,
        delay: offset,
        easing: Easing.linear,
        useNativeDriver: false
      })
    );
    loop.start();
    return () => loop.stop();
  }, [offset, reduce, t]);

  if (reduce) return <Text style={{ color: color.brand }}>{children}</Text>;
  return (
    <Animated.Text
      style={{ color: t.interpolate({ inputRange: WARM_STOPS, outputRange: WARM_COLORS }) }}
    >
      {children}
    </Animated.Text>
  );
}

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hydrated, result } = useAttia();

  // The launch decision runs EXACTLY ONCE, the first time hydration completes:
  // a returning user (persisted result) jumps straight to Home. We must NOT
  // react to `result` changing later — index stays mounted beneath the stack,
  // so redirecting when the quiz sets `result` would yank the user off the
  // reveal screen mid-confetti (the OAT-13 regression this fixes).
  const [decided, setDecided] = useState(false);
  const decidedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || decidedRef.current) return;
    decidedRef.current = true;
    setDecided(true);
    if (result) router.replace("/home");
    // result intentionally read once here; not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, router]);

  // Blank surface only while the launch decision is pending: until hydrated, or
  // (returning user) during the one-shot redirect to Home. After the decision,
  // index always renders the welcome screen — never a stuck blank.
  if (!hydrated || (!decided && result)) {
    return <View className="flex-1 bg-bg" />;
  }

  return (
    <View
      className="flex-1 bg-bg"
      style={{
        // Spec fixes 64px to clear the status bar; max() keeps it safe on a
        // device whose inset is deeper than the prototype's.
        paddingTop: Math.max(screen.top, insets.top),
        paddingHorizontal: screen.x,
        paddingBottom: Math.max(screen.bottom, insets.bottom)
      }}
    >
      <View className="items-center">
        {/* Sparkle — the prototype's own 24-grid path, stroked in brand orange. */}
        <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"
            stroke={color.brand}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>

        <Text
          className="font-display-medium text-text text-center"
          style={{ fontSize: 56, lineHeight: 56, letterSpacing: 56 * 0.02, marginTop: 14 }}
        >
          ATTIA
        </Text>

        {/* Expansion — two uppercase lines, each rising, with one warming word. */}
        <View style={{ marginTop: 17 }}>
          <RiseLine delay={0}>
            <Text
              className="font-display-medium text-center uppercase"
              style={{
                fontSize: 16,
                lineHeight: 16 * 1.55,
                letterSpacing: 16 * 0.26,
                color: color["text-warm"]
              }}
            >
              Authentic <WarmWord offset={0}>Travel</WarmWord>
            </Text>
          </RiseLine>
          <RiseLine delay={120}>
            <Text
              className="font-display-medium text-center uppercase"
              style={{
                fontSize: 16,
                lineHeight: 16 * 1.55,
                letterSpacing: 16 * 0.26,
                color: color["text-warm"]
              }}
            >
              Tailored <WarmWord offset={350}>In Advance</WarmWord>
            </Text>
          </RiseLine>
        </View>

        <Text
          className="font-display text-center"
          style={{ fontSize: 13, lineHeight: 13 * 1.6, color: color.dim, marginTop: 13 }}
        >
          {/* No italic face ships with Bricolage; the colour shift carries it. */}
          <Text style={{ fontStyle: "italic", color: color.muted }}>Atiyah</Text> — gift
        </Text>

        <Text
          className="font-display text-center"
          style={{ fontSize: 17, lineHeight: 17 * 1.4, color: color.brand, marginTop: 18 }}
        >
          Your ATTIA awaits.
        </Text>
      </View>

      <View className="flex-1" />

      <Pressable
        onPress={() => router.push("/quiz")}
        className="w-full rounded-list active:opacity-80"
        style={{ backgroundColor: color.text, padding: 17, marginTop: 28 }}
      >
        <Text
          className="font-display-medium text-center"
          style={{ fontSize: 15.5, lineHeight: 15.5, color: color.bg }}
        >
          Take the quiz
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/how-it-works")}
        className="w-full active:opacity-60"
        style={{ marginTop: 14 }}
        hitSlop={8}
      >
        <Text
          className="font-display text-center"
          style={{ fontSize: 13.5, lineHeight: 13.5 * 1.4, color: color.dim }}
        >
          How it works
        </Text>
      </Pressable>
    </View>
  );
}
