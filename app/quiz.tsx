import { View, Text, Pressable, ScrollView, Animated, Easing, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { ALPHA, color, screen } from "../lib/theme";
import { CHAPTERS, quizQuestions } from "../data/quiz";
import { getPersonalityProfile } from "../lib/scoring/recommendations";
import {
  MIN_ANSWERS_FOR_TINT,
  chapterForIndex,
  chapterIndices,
  chapterToAnnounce,
  partialLeader,
  tintLeader
} from "../lib/quizProgress";
import { hapticLight } from "../lib/feedback";
import { prefersReducedMotion } from "../lib/feedback";
import {
  trackQuizStarted,
  trackQuizCompleted,
  trackQuizChapterReached
} from "../lib/analytics";
import { useAttia } from "../lib/store";
import type { PersonalityId } from "../types";

// Quiz (OAT-101 / OAT-91) — one question per screen, cards not radio rows, and
// a progress bar that takes on the colour of whoever is currently leading.
//
// Ranked "Pick more" mode (OAT-23/53/54/55) is deliberately NOT here: the answer
// model change plus this rebuild in one diff would be unreviewable.

/** The tapped card holds its selected state this long, so the answer is felt. */
const COMMIT_MS = 260;
/** Leader changes cross-fade rather than snapping. */
const TINT_MS = 420;
/** The provisional read lands after this many answers. */
const CHECKPOINT_AT = 8;
const IN_MS = 260;

// react-native-web has no native driver (OAT-71): asking for it there leaves the
// value at its initial state.
const NATIVE_DRIVER = Platform.OS !== "web";
/** Neutral bar colour before there is enough signal to name a leader. */
const NEUTRAL_TINT = rgba(color.text, 0.22);

/** #RRGGBB -> rgba(), so Animated can interpolate between tints of any origin. */
function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Fade + rise for each question and for the checkpoint. Core Animated with a
 * settle timer, per OAT-71: a stalled driver must never leave a question at
 * opacity 0.
 */
function FadeSlideIn({ trigger, children }: { trigger: number | string; children: ReactNode }) {
  const reduce = prefersReducedMotion();
  const t = useRef(new Animated.Value(reduce ? 1 : 0)).current;

  useEffect(() => {
    if (reduce) return;
    t.setValue(0);
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: IN_MS,
      easing: Easing.bezier(0.2, 0.7, 0.3, 1),
      useNativeDriver: NATIVE_DRIVER
    });
    anim.start();
    const settle = setTimeout(() => t.setValue(1), IN_MS + 250);
    return () => {
      anim.stop();
      clearTimeout(settle);
    };
  }, [trigger, reduce, t]);

  return (
    <Animated.View
      style={{
        opacity: t,
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }]
      }}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Cross-fades to a new tint instead of snapping when the leader changes.
 *
 * Returns a colour PAIR plus an opacity driver rather than an interpolated
 * colour: React Native's Animated cannot interpolate colour without the JS
 * driver, and that does not tick on react-native-web — the bar stayed neutral
 * for the whole quiz when this animated the colour directly. Stacking the new
 * tint over the old and animating OPACITY uses the same driver as every other
 * animation in the app, and degrades to "the new colour simply appears".
 */
function useTintPair(target: string) {
  const [pair, setPair] = useState({ from: target, to: target });
  const t = useRef(new Animated.Value(1)).current;
  // The previous target lives in a ref, NOT in the effect's deps. With `pair.to`
  // as a dependency, setPair re-triggered this effect, whose cleanup stopped the
  // animation and cancelled the settle timer one tick after starting them — the
  // new tint was computed correctly and then held at opacity 0 forever.
  const lastTarget = useRef(target);

  useEffect(() => {
    if (lastTarget.current === target) return;
    setPair({ from: lastTarget.current, to: target });
    lastTarget.current = target;
    t.setValue(0);
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: TINT_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: NATIVE_DRIVER
    });
    anim.start();
    // Settle, per OAT-71: a stalled driver must still land on the new tint.
    const settle = setTimeout(() => t.setValue(1), TINT_MS + 250);
    return () => {
      anim.stop();
      clearTimeout(settle);
    };
  }, [target, t]);

  return { from: pair.from, to: pair.to, t };
}

/** One chapter of the progress bar. Filled segments carry the leader's colour. */
function Segment({
  filled,
  tint
}: {
  filled: boolean;
  tint: { from: string; to: string; t: Animated.Value };
}) {
  return (
    <View
      style={{
        flex: 1,
        height: 6,
        borderRadius: 999,
        overflow: "hidden",
        backgroundColor: filled ? tint.from : color.rule
      }}
    >
      {filled && (
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: tint.to,
            opacity: tint.t
          }}
        />
      )}
    </View>
  );
}

export default function Quiz() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { finishQuiz } = useAttia();
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [committing, setCommitting] = useState<string | null>(null);
  const [atCheckpoint, setAtCheckpoint] = useState(false);
  const [checkpointSeen, setCheckpointSeen] = useState(false);

  const question = quizQuestions[qi];
  const answeredCount = Object.keys(answers).length;
  const chapter = chapterForIndex(qi);

  // PARTIAL SCORING — see lib/quizProgress. No new scoring code: the engine is
  // handed only the questions answered so far.
  const leader: PersonalityId | null = tintLeader(quizQuestions, answers);
  // The checkpoint shows a read even before the tint threshold is met.
  const soFarId: PersonalityId | null = partialLeader(quizQuestions, answers);

  const tint = useTintPair(leader ? getPersonalityProfile(leader).accent : NEUTRAL_TINT);

  // quiz_started — user begins the quiz (entry screen mount).
  useEffect(() => {
    trackQuizStarted();
  }, []);

  // quiz_chapter_reached — ONCE per chapter, on entry. Guarded by a ref because
  // stepping back across a boundary and forward again would otherwise re-fire
  // and inflate the very counts this exists to measure. Chapter 1 fires on
  // mount; the Q8 checkpoint holds qi inside chapter 3, so it never re-fires.
  const chaptersFired = useRef<Set<number>>(new Set());
  useEffect(() => {
    const chapter = chapterToAnnounce(qi, chaptersFired.current);
    if (!chapter) return;
    chaptersFired.current.add(chapter.id);
    trackQuizChapterReached({ chapter_id: chapter.id, chapter_name: chapter.name });
  }, [qi]);

  useEffect(() => {
    if (committing === null) return;
    const id = setTimeout(() => commit(committing), COMMIT_MS);
    return () => clearTimeout(id);
    // commit closes over the current question/answers, both stable for this tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committing]);

  function commit(optionId: string) {
    const next = { ...answers, [question.id]: optionId };
    setAnswers(next);
    setCommitting(null);

    const answeredNow = Object.keys(next).length;

    if (qi >= quizQuestions.length - 1) {
      const result = finishQuiz(next);
      if (result) trackQuizCompleted(result.dominant); // quiz_completed { archetype }
      router.replace("/results");
      return;
    }

    // The provisional read, once, after CHECKPOINT_AT answers.
    if (answeredNow === CHECKPOINT_AT && !checkpointSeen) {
      setCheckpointSeen(true);
      setAtCheckpoint(true);
      return;
    }
    setQi(qi + 1);
  }

  function pick(optionId: string) {
    if (committing) return; // ignore double taps mid-commit
    hapticLight();
    setCommitting(optionId);
  }

  function back() {
    if (atCheckpoint) {
      setAtCheckpoint(false);
      return;
    }
    if (qi === 0) {
      router.replace("/"); // Q1 back exits to welcome
      return;
    }
    // Step back AND drop the answer, so re-answering is possible.
    const previous = quizQuestions[qi - 1];
    setAnswers((a) => {
      const next = { ...a };
      delete next[previous.id];
      return next;
    });
    setQi(qi - 1);
  }

  const Header = (
    <View className="flex-row items-center" style={{ gap: 12 }}>
      <Pressable onPress={back} hitSlop={10}>
        <Ionicons name="chevron-back" size={24} color={color.muted} />
      </Pressable>
      {/* Progress clustered by chapter: five groups, three sub-steps each, a
          wider gap between groups than within one. Fill and tint are unchanged —
          a sub-step is filled when its question index is answered. */}
      <View className="flex-1 flex-row" style={{ gap: 10 }}>
        {CHAPTERS.map((chapter) => (
          <View key={chapter.id} className="flex-1 flex-row" style={{ gap: 3 }}>
            {chapterIndices(chapter).map((i) => (
              <Segment key={quizQuestions[i].id} filled={i < answeredCount} tint={tint} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );

  if (atCheckpoint) {
    const soFar = getPersonalityProfile((soFarId ?? "explorer") as PersonalityId);
    return (
      <View className="flex-1 bg-bg">
        {/* Soft accent bloom behind the provisional read. */}
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
          <Svg width="100%" height={420}>
            <Defs>
              <RadialGradient id="soFarBloom" cx="50%" cy="30%" rx="110%" ry="80%">
                <Stop
                  offset="0"
                  stopColor={soFar.accent}
                  stopOpacity={parseInt(ALPHA.glow, 16) / 255}
                />
                <Stop offset="0.7" stopColor={soFar.accent} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height={420} fill="url(#soFarBloom)" />
          </Svg>
        </View>

        <View
          className="flex-1"
          style={{
            paddingTop: Math.max(screen.top, insets.top),
            paddingHorizontal: screen.x,
            paddingBottom: Math.max(screen.bottom, insets.bottom)
          }}
        >
          {Header}
          <View className="flex-1 justify-center">
            <FadeSlideIn trigger="checkpoint">
              <Text
                className="font-display-semibold text-dim uppercase"
                style={{ fontSize: 10, letterSpacing: 10 * 0.24 }}
              >
                So far
              </Text>
              <Text
                className="font-display-medium mt-3"
                style={{
                  fontSize: 34,
                  lineHeight: 34 * 1.05,
                  letterSpacing: 34 * -0.02,
                  color: soFar.accent
                }}
              >
                {soFar.name}
              </Text>
              {/* DRAFT copy — flagged in the PR for Benji. */}
              <Text
                className="font-display text-body mt-3"
                style={{ fontSize: 16, lineHeight: 16 * 1.6 }}
              >
                Seven questions left, and they carry the same weight as the first eight.
              </Text>
              <Text className="font-display text-dim mt-2" style={{ fontSize: 13 }}>
                This can still change.
              </Text>
            </FadeSlideIn>
          </View>

          <Pressable
            onPress={() => {
              setAtCheckpoint(false);
              setQi(qi + 1);
            }}
            className="w-full rounded-list active:opacity-80"
            style={{ backgroundColor: color.text, padding: 17 }}
          >
            <Text
              className="font-display-medium text-center"
              style={{ fontSize: 15.5, lineHeight: 15.5, color: color.bg }}
            >
              Keep going
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-bg"
      style={{
        paddingTop: Math.max(screen.top, insets.top),
        paddingHorizontal: screen.x,
        paddingBottom: Math.max(screen.bottom, insets.bottom)
      }}
    >
      {Header}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
        <FadeSlideIn trigger={qi}>
          {/* Chapter, not a count. The numeric position is gone from the UI but
              kept for screen readers, where "how far in am I" has no visual
              substitute. */}
          <Text
            className="font-display-semibold text-dim uppercase mt-7"
            style={{ fontSize: 10, letterSpacing: 10 * 0.2 }}
            accessibilityLabel={
              chapter
                ? `Chapter ${chapter.id}, ${chapter.name}. Question ${qi + 1} of ${quizQuestions.length}.`
                : `Question ${qi + 1} of ${quizQuestions.length}.`
            }
          >
            {chapter ? `Chapter ${chapter.id} · ${chapter.name}` : ""}
          </Text>
          <Text
            className="font-display-medium text-text mt-3"
            style={{ fontSize: 23, lineHeight: 23 * 1.25, letterSpacing: 23 * -0.015 }}
          >
            {question.prompt}
          </Text>
          <Text className="font-display text-muted mt-2 mb-5" style={{ fontSize: 13.5 }}>
            {question.helper}
          </Text>

          {question.options.map((o) => {
            const selected = committing === o.id;
            return (
              <Pressable
                key={o.id}
                onPress={() => pick(o.id)}
                className="rounded-option mb-2 active:opacity-90"
                style={{
                  padding: 14,
                  backgroundColor: selected ? color["surface-raised"] : color.surface,
                  borderWidth: 1,
                  borderColor: selected ? color["line-strong"] : color.line
                }}
              >
                <Text
                  className={selected ? "font-display text-text" : "font-display text-body-strong"}
                  style={{ fontSize: 13, lineHeight: 13 * 1.35 }}
                >
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </FadeSlideIn>
      </ScrollView>
    </View>
  );
}
