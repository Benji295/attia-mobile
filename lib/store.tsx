import { createContext, useContext, useState, type ReactNode } from "react";

export type QuizResult = { top: string; tally: Record<string, number> };

type AttiaState = {
  result: QuizResult | null;
  saved: string[];
  finishQuiz: (answerKeys: string[]) => void;
  toggleSave: (id: string) => void;
  reset: () => void;
};

const AttiaContext = createContext<AttiaState | null>(null);

export function AttiaProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<QuizResult | null>(null);
  const [saved, setSaved] = useState<string[]>([]);

  const finishQuiz = (answerKeys: string[]) => {
    const tally: Record<string, number> = {};
    answerKeys.forEach((k) => {
      tally[k] = (tally[k] || 0) + 1;
    });
    const top = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
    setResult({ top, tally });
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
