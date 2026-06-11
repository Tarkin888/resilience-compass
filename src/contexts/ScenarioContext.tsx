// Live-overlay scenario state shared between the Scenario Testing tab
// and the Scenario Impact tab. State only — never persisted.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface ScenarioState {
  /** Hypothetical raw KRI values keyed by kri_id (omit = use live value). */
  overrides: Record<string, number>;
  /** True once the user clicks Run Scenario with at least one change. */
  hasRun: boolean;
}

interface ScenarioContextValue extends ScenarioState {
  setOverride: (kriId: string, value: number | null) => void;
  resetOverrides: () => void;
  runScenario: () => void;
  clearRun: () => void;
}

const ScenarioContext = createContext<ScenarioContextValue | null>(null);

export const ScenarioProvider = ({ children }: { children: ReactNode }) => {
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [hasRun, setHasRun] = useState(false);

  const setOverride = useCallback((kriId: string, value: number | null) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (value == null || !Number.isFinite(value)) delete next[kriId];
      else next[kriId] = value;
      return next;
    });
    setHasRun(false);
  }, []);

  const resetOverrides = useCallback(() => {
    setOverrides({});
    setHasRun(false);
  }, []);

  const runScenario = useCallback(() => setHasRun(true), []);
  const clearRun = useCallback(() => setHasRun(false), []);

  const value = useMemo(
    () => ({ overrides, hasRun, setOverride, resetOverrides, runScenario, clearRun }),
    [overrides, hasRun, setOverride, resetOverrides, runScenario, clearRun],
  );

  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>;
};

export const useScenario = () => {
  const ctx = useContext(ScenarioContext);
  if (!ctx) throw new Error("useScenario must be used inside ScenarioProvider");
  return ctx;
};
