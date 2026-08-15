// Explicit globals: TypeScript 6 no longer auto-includes @types/*.
import { describe, expect, it } from "@jest/globals";
import { quizQuestions } from "../data/quiz";
import { scoreQuiz } from "../lib/scoring/recommendations";
import { MIN_ANSWERS_FOR_TINT, partialLeader, tintLeader } from "../lib/quizProgress";
import { personalityIds, type PersonalityId } from "../types";

/**
 * OAT-101 — the tinted progress bar reads a leader from PARTIAL answers.
 *
 * The mechanism is deliberately not new scoring code: scoreQuiz requires the
 * answer count to match the question count, so it is handed only the questions
 * answered so far. These tests pin that contract, because the quiz screen's
 * colour depends on it and a silent null would render the bar permanently
 * neutral.
 */

/** Answer the first `n` questions with the option weighting `target` highest. */
function leadingAnswers(target: PersonalityId, n: number): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const q of quizQuestions.slice(0, n)) {
    const best = [...q.options].sort(
      (a, b) => (b.weights[target] ?? 0) - (a.weights[target] ?? 0)
    )[0];
    answers[q.id] = best.id;
  }
  return answers;
}

/** The shipped helper the quiz screen calls — not a replica of it. */
const leaderFrom = (answers: Record<string, string>) => partialLeader(quizQuestions, answers);

describe("partial scoring reuses the real engine", () => {
  it("returns null on a full question list with partial answers — the trap", () => {
    // This is why the screen slices the questions: handing scoreQuiz all 15 with
    // 3 answers returns null, and the bar would never tint.
    expect(scoreQuiz(quizQuestions, leadingAnswers("explorer", 3))).toBeNull();
  });

  it("scores a real leader from as few as one answer when given the subset", () => {
    for (let n = 1; n <= 5; n++) {
      expect(leaderFrom(leadingAnswers("explorer", n))).toBe("explorer");
    }
  });

  it("names each archetype as leader from its own partial path", () => {
    for (const id of personalityIds) {
      expect(leaderFrom(leadingAnswers(id, 4))).toBe(id);
    }
  });

  it("has no leader before any answer", () => {
    expect(leaderFrom({})).toBeNull();
  });

  it("tracks a genuine change of lead rather than freezing on the first answer", () => {
    // Four answers leaning Explorer, then five leaning Epicurean: the leader
    // must move.
    const answers = leadingAnswers("explorer", 4);
    expect(leaderFrom(answers)).toBe("explorer");

    for (const q of quizQuestions.slice(4, 11)) {
      const best = [...q.options].sort(
        (a, b) => (b.weights.epicurean ?? 0) - (a.weights.epicurean ?? 0)
      )[0];
      answers[q.id] = best.id;
    }
    expect(leaderFrom(answers)).toBe("epicurean");
  });

  it("the partial leader agrees with the final result when the path does not change", () => {
    const full = leadingAnswers("connector", quizQuestions.length);
    expect(leaderFrom(full)).toBe("connector");
    expect(scoreQuiz(quizQuestions, full)?.dominant).toBe("connector");
  });
});

describe("the tint threshold", () => {
  it("stays neutral until there is enough signal", () => {
    for (let n = 1; n < MIN_ANSWERS_FOR_TINT; n++) {
      expect(tintLeader(quizQuestions, leadingAnswers("explorer", n))).toBeNull();
    }
  });

  it("commits to a colour at the threshold", () => {
    expect(tintLeader(quizQuestions, leadingAnswers("explorer", MIN_ANSWERS_FOR_TINT))).toBe(
      "explorer"
    );
  });
});

describe("the authored set (OAT-91)", () => {
  it("is fifteen questions of eight options", () => {
    expect(quizQuestions).toHaveLength(15);
    expect([...new Set(quizQuestions.map((q) => q.options.length))]).toEqual([8]);
  });

  it("weights only real archetype ids", () => {
    for (const q of quizQuestions) {
      for (const o of q.options) {
        for (const id of Object.keys(o.weights)) {
          expect(personalityIds).toContain(id as PersonalityId);
        }
      }
    }
  });

  it("leaves every archetype reachable — each pure path resolves to itself", () => {
    for (const id of personalityIds) {
      expect(scoreQuiz(quizQuestions, leadingAnswers(id, quizQuestions.length))?.dominant).toBe(id);
    }
  });

  it("uses unique question and option ids", () => {
    const qids = quizQuestions.map((q) => q.id);
    expect(new Set(qids).size).toBe(qids.length);
    const oids = quizQuestions.flatMap((q) => q.options.map((o) => o.id));
    expect(new Set(oids).size).toBe(oids.length);
  });
});
