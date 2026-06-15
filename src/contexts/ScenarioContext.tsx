// Live-overlay scenario state shared between the Scenario Testing tab
// and the Scenario Impact tab. State only — never persisted.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface SelectedScenarioInfo {
  id: string;
  title: string;
  severity?: string;
}

export interface ScenarioState {
  overrides: Record<string, number>;
  hasRun: boolean;
  /** The preset scenario currently applied, if any. */
  selectedScenario: SelectedScenarioInfo | null;
  /** True if the user has manually edited inputs after selecting a preset. */
  scenarioModified: boolean;
}

interface ScenarioContextValue extends ScenarioState {
  setOverride: (kriId: string, value: number | null) => void;
  resetOverrides: () => void;
  runScenario: () => void;
  clearRun: () => void;
  setSelectedScenario: (scenario: SelectedScenarioInfo | null) => void;
  markScenarioModified: () => void;
}

const ScenarioContext = createContext<ScenarioContextValue | null>(null);

export const ScenarioProvider = ({ children }: { children: ReactNode }) => {
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [hasRun, setHasRun] = useState(false);
  const [selectedScenario, setSelectedScenarioState] = useState<SelectedScenarioInfo | null>(null);
  const [scenarioModified, setScenarioModified] = useState(false);

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
    setSelectedScenarioState(null);
    setScenarioModified(false);
  }, []);

  const runScenario = useCallback(() => setHasRun(true), []);
  const clearRun = useCallback(() => setHasRun(false), []);

  const setSelectedScenario = useCallback((scenario: SelectedScenarioInfo | null) => {
    setSelectedScenarioState(scenario);
    setScenarioModified(false);
  }, []);

  const markScenarioModified = useCallback(() => setScenarioModified(true), []);

  const value = useMemo<ScenarioContextValue>(
    () => ({
      overrides,
      hasRun,
      selectedScenario,
      scenarioModified,
      setOverride,
      resetOverrides,
      runScenario,
      clearRun,
      setSelectedScenario,
      markScenarioModified,
    }),
    [overrides, hasRun, selectedScenario, scenarioModified, setOverride, resetOverrides, runScenario, clearRun, setSelectedScenario, markScenarioModified],
  );

  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>;
};

export const useScenario = () => {
  const ctx = useContext(ScenarioContext);
  if (!ctx) throw new Error("useScenario must be used inside ScenarioProvider");
  return ctx;
};
