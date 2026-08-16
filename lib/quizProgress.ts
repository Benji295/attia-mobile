import { scoreQuiz } from "./scoring/recommendations";
import { CHAPTERS, type QuizChapter } from "../data/quiz";
import type { PersonalityId, QuizQuestion } from "../types";

/**
 * Who is currently leading, from a partial answer map (OAT-101).
 *
 * NO NEW SCORING. scoreQuiz requires the answer count to match the question
 * count, so it is handed only the questions answered so far — the same
 * weight-summing engine then produces a real interim result. Passing the full
 * question list with partial answers returns null, which would leave the
 * progress bar permanently neutral; that trap is what this function exists to
 * close, and it is pinned by a test.
 */
export function partialLeader(
  questions: QuizQuestion[],
  answers: Record<string, string>
): PersonalityId | null {
  const answered = questions.filter((q) => answers[q.id]);
  if (answered.length === 0) return null;
  return scoreQuiz(answered, answers)?.dominant ?? null;
}

/** Answers required before the bar commits to a colour — 1–2 taps is noise. */
export const MIN_ANSWERS_FOR_TINT = 3;

/**
 * The leader the progress bar should render, or null to stay neutral. Separate
 * from partialLeader so the "not enough signal yet" rule is testable on its own.
 */
export function tintLeader(
  questions: QuizQuestion[],
  answers: Record<string, string>
): PersonalityId | null {
  if (Object.keys(answers).length < MIN_ANSWERS_FOR_TINT) return null;
  return partialLeader(questions, answers);
}

/**
 * The chapter a question index belongs to, or null if it falls outside every
 * declared range — which is the signal that CHAPTERS needs updating, not a case
 * to paper over.
 */
export function chapterForIndex(index: number): QuizChapter | null {
  return CHAPTERS.find((c) => index >= c.from && index <= c.to) ?? null;
}

/** Zero-based question indices belonging to a chapter, in order. */
export function chapterIndices(chapter: QuizChapter): number[] {
  const out: number[] = [];
  for (let i = chapter.from; i <= chapter.to; i++) out.push(i);
  return out;
}

/**
 * The chapter whose entry should be announced (OAT-101), or null.
 *
 * Fires ONCE per chapter per quiz session: stepping back across a boundary and
 * forward again would otherwise re-fire and inflate the very counts this event
 * exists to measure — where people abandon the quiz.
 *
 * A function rather than logic inline in the screen so the rule is covered by a
 * test that drives the shipped code, not a copy of it.
 */
export function chapterToAnnounce(
  index: number,
  alreadyAnnounced: ReadonlySet<number>
): QuizChapter | null {
  const chapter = chapterForIndex(index);
  if (!chapter || alreadyAnnounced.has(chapter.id)) return null;
  return chapter;
}
