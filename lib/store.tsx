import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { quizQuestions } from "../data/quiz";
import { scoreQuiz } from "./scoring/recommendations";
import type { Activity, QuizResult } from "../types";

type AttiaState = {
  result: QuizResult | null;
  saved: string[];
  /** Activities seen this session, keyed by id — populated as Discover fetches
      live data, so Saved/Itinerary resolve saved ids from the same set. */
  activityCache: Record<string, Activity>;
  /** answers: map of quiz question id -> chosen option id */
  finishQuiz: (answers: Record<string, string>) => QuizResult | null;
  toggleSave: (id: string) => void;
  cacheActivities: (list: Activity[]) => void;
  reset: () => void;
};

const AttiaContext = createContext<AttiaState | null>(null);

export function AttiaProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<QuizResult | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [activityCache, setActivityCache] = useState<Record<string, Activity>>({});

  // Compute the result with the real scoring engine (scoreQuiz), not a tally.
  const finishQuiz = (answers: Record<string, string>) => {
    const next = scoreQuiz(quizQuestions, answers);
    setResult(next);
    return next;
  };

  const toggleSave = (id: string) =>
    setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const cacheActivities = useCallback((list: Activity[]) => {
    setActivityCache((prev) => {
      const next = { ...prev };
      for (const a of list) next[a.id] = a;
      return next;
    });
  }, []);

  const reset = () => {
    setResult(null);
    setSaved([]);
  };

  return (
    <AttiaContext.Provider
      value={{ result, saved, activityCache, finishQuiz, toggleSave, cacheActivities, reset }}
    >
      {children}
    </AttiaContext.Provider>
  );
}

export function useAttia() {
  const ctx = useContext(AttiaContext);
  if (!ctx) throw new Error("useAttia must be used inside <AttiaProvider>");
  return ctx;
}
