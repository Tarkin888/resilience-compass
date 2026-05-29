import type { Direction } from "@/lib/scoringEngine";

export interface Tab1EngineConfig {
  /** Working target (live targets are also stored here so Tab 3 can use the same source). */
  target: number;
  minimumThreshold: number;
  direction: Direction;
}

/**
 * Engine configuration for each Tab 1 data point — the single source of truth
 * for the per-data-point {target, minimumThreshold, direction} triple used by
 * both the Tab 1 badge and the Tab 3 Scenario Visualiser STATUS column.
 *
 * For live data points (sickness_absence, vacancy) Tab 1 prefers the
 * runtime `thresholds.threshold_value` when present, falling back to the
 * `target` value here. The two are kept aligned so Tab 1 and Tab 3 agree.
 *
 * Minimum thresholds are illustrative until Rick confirms (8 June 2026 agenda).
 */
export const TAB1_ENGINE_CONFIG: Record<string, Tab1EngineConfig> = {
  sickness_absence: { target: 4.2, minimumThreshold: 6.0, direction: "lowerIsBetter" },
  vacancy: { target: 8.5, minimumThreshold: 12, direction: "lowerIsBetter" },
  training_compliance: { target: 95, minimumThreshold: 60, direction: "higherIsBetter" },
  staff_engagement_score: { target: 7.5, minimumThreshold: 5.0, direction: "higherIsBetter" },
  voluntary_turnover: { target: 10, minimumThreshold: 16, direction: "lowerIsBetter" },
};
