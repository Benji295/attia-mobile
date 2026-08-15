import { scoreQuiz } from "./scoring/recommendations";
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
