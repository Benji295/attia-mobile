// Explicit globals: TypeScript 6 no longer auto-includes @types/*.
import { describe, expect, it } from "@jest/globals";
import { CHAPTERS, quizQuestions } from "../data/quiz";
import { chapterForIndex, chapterIndices, chapterToAnnounce } from "../lib/quizProgress";

/**
 * OAT-101 — the chapter map (five chapters, three questions each).
 *
 * Ranges are declared explicitly rather than derived from Math.floor(i / 3),
 * so this file is what makes a 16th question BREAK rather than silently fall
 * outside every chapter and render a blank eyebrow.
 */

describe("chapter coverage", () => {
  it("is five chapters", () => {
    expect(CHAPTERS).toHaveLength(5);
    expect(CHAPTERS.map((c) => c.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("covers EVERY question index — a 16th question fails here", () => {
    for (let i = 0; i < quizQuestions.length; i++) {
      expect(chapterForIndex(i)).not.toBeNull();
    }
    const covered = CHAPTERS.flatMap(chapterIndices);
    expect(covered).toHaveLength(quizQuestions.length);
    expect([...covered].sort((a, b) => a - b)).toEqual(
      quizQuestions.map((_, i) => i)
    );
  });

  it("has no gaps and no overlaps", () => {
    const covered = CHAPTERS.flatMap(chapterIndices);
    expect(new Set(covered).size).toBe(covered.length); // no index twice
    for (let i = 1; i < CHAPTERS.length; i++) {
      expect(CHAPTERS[i].from).toBe(CHAPTERS[i - 1].to + 1); // contiguous
    }
  });

  it("declares nothing beyond the question set", () => {
    expect(Math.min(...CHAPTERS.map((c) => c.from))).toBe(0);
    expect(Math.max(...CHAPTERS.map((c) => c.to))).toBe(quizQuestions.length - 1);
    expect(chapterForIndex(quizQuestions.length)).toBeNull();
    expect(chapterForIndex(-1)).toBeNull();
  });

  it("maps the ranges the brief specified", () => {
    expect(CHAPTERS).toEqual([
      { id: 1, name: "How You Start", from: 0, to: 2 },
      { id: 2, name: "What You Keep", from: 3, to: 5 },
      { id: 3, name: "How You Move", from: 6, to: 8 },
      { id: 4, name: "What Pulls You", from: 9, to: 11 },
      { id: 5, name: "How It Lands", from: 12, to: 14 }
    ]);
  });

  it("puts each question in the chapter a user would expect", () => {
    expect(chapterForIndex(0)?.name).toBe("How You Start"); // Q1
    expect(chapterForIndex(2)?.name).toBe("How You Start"); // Q3
    expect(chapterForIndex(3)?.name).toBe("What You Keep"); // Q4
    expect(chapterForIndex(6)?.name).toBe("How You Move"); // Q7
    expect(chapterForIndex(7)?.name).toBe("How You Move"); // Q8 — the checkpoint
    expect(chapterForIndex(9)?.name).toBe("What Pulls You"); // Q10
    expect(chapterForIndex(14)?.name).toBe("How It Lands"); // Q15
  });

  it("gives every chapter exactly three sub-steps for the progress bar", () => {
    for (const c of CHAPTERS) expect(chapterIndices(c)).toHaveLength(3);
  });
});

describe("the eyebrow and its screen-reader label", () => {
  /** Exactly what app/quiz.tsx renders. */
  const visible = (qi: number) => {
    const c = chapterForIndex(qi);
    return c ? `Chapter ${c.id} · ${c.name}` : "";
  };
  const spoken = (qi: number) => {
    const c = chapterForIndex(qi);
    return c
      ? `Chapter ${c.id}, ${c.name}. Question ${qi + 1} of ${quizQuestions.length}.`
      : `Question ${qi + 1} of ${quizQuestions.length}.`;
  };

  it("shows the chapter and never a raw count", () => {
    expect(visible(6)).toBe("Chapter 3 · How You Move");
    for (let i = 0; i < quizQuestions.length; i++) {
      expect(visible(i)).not.toMatch(/Question \d+ of/);
    }
  });

  it("keeps the count for screen readers", () => {
    expect(spoken(6)).toBe("Chapter 3, How You Move. Question 7 of 15.");
    expect(spoken(0)).toBe("Chapter 1, How You Start. Question 1 of 15.");
    expect(spoken(14)).toBe("Chapter 5, How It Lands. Question 15 of 15.");
  });
});

describe("quiz_chapter_reached fires once per chapter", () => {
  /** Replays a walk through the quiz, exactly as the screen does. */
  function announce(indices: number[]) {
    const fired = new Set<number>();
    const events: { chapter_id: number; chapter_name: string }[] = [];
    for (const i of indices) {
      const c = chapterToAnnounce(i, fired);
      if (!c) continue;
      fired.add(c.id);
      events.push({ chapter_id: c.id, chapter_name: c.name });
    }
    return events;
  }

  it("emits one event per chapter across a full forward run", () => {
    const events = announce(quizQuestions.map((_, i) => i));
    expect(events).toEqual([
      { chapter_id: 1, chapter_name: "How You Start" },
      { chapter_id: 2, chapter_name: "What You Keep" },
      { chapter_id: 3, chapter_name: "How You Move" },
      { chapter_id: 4, chapter_name: "What Pulls You" },
      { chapter_id: 5, chapter_name: "How It Lands" }
    ]);
  });

  it("does not re-fire when the user steps back across a boundary", () => {
    // Into chapter 2, back into chapter 1, forward again.
    const events = announce([0, 1, 2, 3, 2, 3, 4]);
    expect(events.map((e) => e.chapter_id)).toEqual([1, 2]);
  });

  it("fires chapter 1 on mount, before any answer", () => {
    expect(announce([0])).toEqual([{ chapter_id: 1, chapter_name: "How You Start" }]);
  });

  it("does not fire again while the Q8 checkpoint holds the index in chapter 3", () => {
    // Q7 enters chapter 3; Q8 (index 7) is the checkpoint; Q9 stays in chapter 3.
    const events = announce([6, 7, 7, 8]);
    expect(events.map((e) => e.chapter_id)).toEqual([3]);
  });
});
