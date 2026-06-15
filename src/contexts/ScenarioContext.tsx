// Live-overlay scenario state shared between the Scenario Testing tab
// and the Scenario Impact tab. State only — never persisted.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface SelectedScenarioInfo {
  id: string;
  title: string;
  severity?: string;
}

export interface ScenarioState {
  /** Hypothetical raw KRI values keyed by kri_id (omit = use live value). */
  overrides: Record<string, number>;
  /** True once the user clicks Run Scenario with at least one change. */
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

  const value = useMemo(
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
    }),
    [overrides, hasRun, selectedScenario, scenarioModified, setOverride, resetOverrides, runScenario, clearRun, setSelectedScenario],
  );

  // Wrap setOverride to track modification when a preset is active.
  const wrappedValue = useMemo<ScenarioContextValue>(() => ({
    ...value,
    setOverride: (kriId: string, val: number | null) => {
      setOverride(kriId, val);
      if (selectedScenario) setScenarioModified(true);
    },
  }), [value, setOverride, selectedScenario]);

  return <ScenarioContext.Provider value={wrappedValue}>{children}</ScenarioContext.Provider>;
};

export const useScenario = () => {
  const ctx = useContext(ScenarioContext);
  if (!ctx) throw new Error("useScenario must be used inside ScenarioProvider");
  return ctx;
};
