import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  ImageBackground,
  useWindowDimensions
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef, type ReactNode } from "react";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import ConfettiCannon from "react-native-confetti-cannon";
import { color, screen, withAlpha } from "../lib/theme";
import { archetypeImages } from "../lib/archetypeImages";
import { blendSentence } from "../lib/blend";
import { getPersonalityProfile } from "../lib/scoring/recommendations";
import { personalityIds, type PersonalityId } from "../types";
import { hapticSuccess, prefersReducedMotion } from "../lib/feedback";
import { trackArchetypeRevealed } from "../lib/analytics";
import { useAttia } from "../lib/store";

// Reveal (OAT-67), rebuilt to design/ATTIA_Merged_dc.html. The screen where a
// tester finds out who they are — it should read as an arrival.

const SCREEN_W = Dimensions.get("window").width;

// The archetype card runs full-bleed from the top at FULL strength — it is not
// dimmed. What makes bright cards (Explorer, Culture Vulture) usable is the
// scrim below it, which ramps to solid #0D0D0F by ~55% of screen height so the
// spectrum card always sits on flat dark.
// Measured per render, not captured at import: a module-scope Dimensions.get()
// is stale after a rotation.
const CARD_FRACTION = 0.55;
// Stops: clear over the subject, then an accelerating ramp that is FULLY opaque
// by 78% of the card. Content starts at CONTENT_START (just past that), so the
// headline never sits on lit photo — measured at 1.6:1 against the Explorer card
// when it did. The image itself is never dimmed; the ramp is the whole
// mechanism, and the top third stays at full strength.
const SCRIM_STOPS: [number, number][] = [
  [0, 0],
  [0.3, 0.12],
  [0.55, 0.58],
  [0.78, 1],
  [1, 1]
];
/** Where the scroll content begins, as a fraction of the card height. */
const CONTENT_START = 0.8;

// react-native-web has no native driver; asking for it there leaves the value at
// its initial state (OAT-71 shipped the same guard on Welcome).
const NATIVE_DRIVER = Platform.OS !== "web";
const IN_MS = 520;

/**
 * Fade + rise for the reveal's headline block. Core Animated with a settle
 * timer, matching Welcome (OAT-71): Reanimated's shared values stalled and its
 * `entering` animations absolutely-positioned their wrappers, either of which
 * would leave the archetype name — the whole point of this screen — invisible.
 */
function RevealIn({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  const reduce = prefersReducedMotion();
  const t = useRef(new Animated.Value(reduce ? 1 : 0)).current;

  useEffect(() => {
    if (reduce) return;
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: IN_MS,
      delay,
      easing: Easing.bezier(0.2, 0.7, 0.3, 1),
      useNativeDriver: NATIVE_DRIVER
    });
    anim.start();
    // Whatever the driver does, the content is at rest by the time the animation
    // should have finished. A no-op if it played; a snap to visible if it stalled.
    const settle = setTimeout(() => t.setValue(1), delay + IN_MS + 250);
    return () => {
      anim.stop();
      clearTimeout(settle);
    };
  }, [delay, reduce, t]);

  return (
    <Animated.View
      style={{
        opacity: t,
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }]
      }}
    >
      {children}
    </Animated.View>
  );
}

/** Card chrome shared by the spectrum and city-vibe cards. */
function Card({ children }: { children: ReactNode }) {
  return (
    <View className="bg-surface border border-line rounded-card" style={{ padding: 20 }}>
      {children}
    </View>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Text
      className="font-display-semibold text-dim uppercase"
      style={{ fontSize: 10, letterSpacing: 10 * 0.2 }}
    >
      {children}
    </Text>
  );
}

export default function Results() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hydrated, result } = useAttia();
  const { height: windowHeight } = useWindowDimensions();

  // Wait for hydration before bouncing. `result` is null for the first frames of
  // a cold start, so the un-guarded version sent anyone who reloaded or deep-
  // linked onto this screen straight back to "/" — and index then forwards a
  // returning user to Home, losing the reveal entirely. Arriving from the quiz
  // was never affected: finishQuiz() sets `result` before the route changes.
  useEffect(() => {
    if (hydrated && !result) router.replace("/");
  }, [hydrated, result]);

  // Tier 3: success haptic + archetype_revealed as the archetype lands (once).
  useEffect(() => {
    if (result) {
      hapticSuccess();
      trackArchetypeRevealed(result.dominant);
    }
    // fire once on mount of a valid reveal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!result) return null;

  const top = getPersonalityProfile(result.dominant);
  // Confetti from the locked palette: the archetype's accent + its secondaries
  // + brand warmth — never a random rainbow.
  const confettiColors = [
    top.accent,
    ...result.secondary.map((id) => getPersonalityProfile(id).accent),
    color.brand
  ];

  // The spectrum shows ALL EIGHT archetypes from the engine's own score vector —
  // scoreQuiz seeds with emptyWeights(), so every id is present and a 0 is a
  // real score, not a gap. Bars are normalised against the TOP score, not 100:
  //
  //     width% = round(score[id] / max(scores) * 100)
  //
  // so the dominant always reads full-width and the rest are relative to it.
  // Against 100 every bar would be a sliver, since raw scores never approach it.
  const cardHeight = Math.round(windowHeight * CARD_FRACTION);

  const topScore = Math.max(...personalityIds.map((id) => result.scores[id]));
  const spectrum = [...personalityIds]
    .sort((a, b) => result.scores[b] - result.scores[a])
    .map((id) => ({
      id,
      pct: topScore > 0 ? Math.round((result.scores[id] / topScore) * 100) : 0
    }));

  return (
    <View className="flex-1 bg-bg">
      {/* The archetype card, full-bleed from the top at FULL strength — never
          dimmed. The scrim below it does the work: transparent over the subject,
          ramping to solid #0D0D0F by ~55% of screen height, which is what makes
          the bright cards (Explorer, Culture Vulture) usable without touching
          the image itself. RN has no CSS gradients, so this is
          react-native-svg's LinearGradient. */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: cardHeight,
          overflow: "hidden"
        }}
      >
        <ImageBackground
          source={archetypeImages[result.dominant]}
          resizeMode="cover"
          style={{ width: "100%", height: "100%" }}
          // Atmosphere, not information: the reveal reads identically without it.
          accessible={false}
        >
          <Svg width="100%" height={cardHeight} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="cardScrim" x1="0" y1="0" x2="0" y2="1">
                {SCRIM_STOPS.map(([offset, opacity]) => (
                  <Stop key={offset} offset={offset} stopColor={color.bg} stopOpacity={opacity} />
                ))}
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height={cardHeight} fill="url(#cardScrim)" />
          </Svg>
        </ImageBackground>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          // Clear the card's lit band — see SCRIM_STOPS.
          paddingTop: Math.max(screen.top, insets.top) + Math.round(cardHeight * CONTENT_START),
          paddingHorizontal: screen.x,
          paddingBottom: Math.max(screen.bottom, insets.bottom)
        }}
      >
        <RevealIn>
          <Eyebrow>You are</Eyebrow>
          <Text
            className="font-display-medium mt-2"
            style={{
              fontSize: 42,
              lineHeight: 42 * 1.05,
              letterSpacing: 42 * -0.02,
              color: top.accent
            }}
          >
            {top.name}
          </Text>
        </RevealIn>

        <RevealIn delay={120}>
          <Text
            className="font-display text-body mt-3"
            style={{ fontSize: 16, lineHeight: 16 * 1.6 }}
          >
            {blendSentence(result)}
          </Text>

          {/* Trait pills — 1px border at accent+44, label in the accent. */}
          <View className="flex-row flex-wrap mt-4" style={{ gap: 8 }}>
            {top.traits.map((trait) => (
              <View
                key={trait}
                className="rounded-pill border"
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 13,
                  borderColor: withAlpha(top.accent, "pillBorder")
                }}
              >
                <Text className="font-display" style={{ fontSize: 12, color: top.accent }}>
                  {trait}
                </Text>
              </View>
            ))}
          </View>
        </RevealIn>

        <RevealIn delay={220}>
          <View className="mt-7">
            <Card>
              <Eyebrow>Your spectrum</Eyebrow>
              <View className="mt-4" style={{ gap: 13 }}>
                {spectrum.map(({ id, pct }) => {
                  const profile = getPersonalityProfile(id as PersonalityId);
                  const isDominant = id === result.dominant;
                  return (
                    <View key={id}>
                      <View className="flex-row items-baseline justify-between">
                        <Text
                          className={
                            isDominant
                              ? "font-display-medium text-text"
                              : "font-display text-muted"
                          }
                          style={{ fontSize: 13 }}
                          numberOfLines={1}
                        >
                          {profile.name.replace("The ", "")}
                        </Text>
                        {/* `muted`, not the design's #6E6B78 — that fails AA on a
                            surface card (see the rule in lib/tokens.js). */}
                        <Text className="font-display text-muted" style={{ fontSize: 11 }}>
                          {pct}%
                        </Text>
                      </View>
                      <View
                        className="bg-rule rounded-pill overflow-hidden mt-1.5"
                        style={{ height: 5 }}
                      >
                        <View
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            backgroundColor: isDominant
                              ? profile.accent
                              : withAlpha(profile.accent, "barMuted")
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>

            <View className="mt-3">
              <Card>
                <Text
                  className="font-display text-muted"
                  style={{ fontSize: 13.5, lineHeight: 13.5 * 1.65 }}
                >
                  {top.cityVibe}
                </Text>
              </Card>
            </View>

            <Pressable
              onPress={() => router.replace("/home")}
              className="mt-7 w-full rounded-list active:opacity-80"
              style={{ backgroundColor: color.text, padding: 17 }}
            >
              <Text
                className="font-display-medium text-center"
                style={{ fontSize: 15.5, lineHeight: 15.5, color: color.bg }}
              >
                Discover your ATTIA
              </Text>
            </Pressable>

            {/*
              Routes to the quiz and does NOTHING else. It deliberately does not
              call reset(), which also wipes every save and the cities-explored
              floor — a "Retake quiz" button has no business destroying saves
              (that is OAT-93's bug, and it was live on this screen until now).
              No clear is needed: finishQuiz() overwrites `result` on completion,
              and abandoning the quiz leaves the existing archetype intact rather
              than emptying the profile.
            */}
            <Pressable
              onPress={() => router.replace("/quiz")}
              className="mt-3 w-full border border-line rounded-list active:opacity-80"
              style={{ padding: 15 }}
            >
              <Text className="font-display text-muted text-center" style={{ fontSize: 13.5 }}>
                Retake quiz
              </Text>
            </Pressable>
          </View>
        </RevealIn>
      </ScrollView>

      {/* One-shot celebratory burst on reveal. pointerEvents="none" so it never
          blocks the reveal content or the CTA; fadeOut lets it settle. Skipped
          under Reduce Motion (the haptic + name animation still play). */}
      {!prefersReducedMotion() && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiCannon
            count={80}
            origin={{ x: SCREEN_W / 2, y: -20 }}
            colors={confettiColors}
            fadeOut
            autoStart
            explosionSpeed={350}
            fallSpeed={2600}
          />
        </View>
      )}
    </View>
  );
}
