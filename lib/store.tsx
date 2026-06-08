import { createContext, useContext, useState, type ReactNode } from "react";
import { quizQuestions } from "../data/quiz";
import { scoreQuiz } from "./scoring/recommendations";
import type { QuizResult } from "../types";

type AttiaState = {
  result: QuizResult | null;
  saved: string[];
  /** answers: map of quiz question id -> chosen option id */
  finishQuiz: (answers: Record<string, string>) => QuizResult | null;
  toggleSave: (id: string) => void;
  reset: () => void;
};

const AttiaContext = createContext<AttiaState | null>(null);

export function AttiaProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<QuizResult | null>(null);
  const [saved, setSaved] = useState<string[]>([]);

  // Compute the result with the real scoring engine (scoreQuiz), not a tally.
  const finishQuiz = (answers: Record<string, string>) => {
    const next = scoreQuiz(quizQuestions, answers);
    setResult(next);
    return next;
  };

  const toggleSave = (id: string) =>
    setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const reset = () => {
    setResult(null);
    setSaved([]);
  };

  return (
    <AttiaContext.Provider value={{ result, saved, finishQuiz, toggleSave, reset }}>
      {children}
    </AttiaContext.Provider>
  );
}

export function useAttia() {
  const ctx = useContext(AttiaContext);
  if (!ctx) throw new Error("useAttia must be used inside <AttiaProvider>");
  return ctx;
}
