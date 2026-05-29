import type { Direction } from "@/lib/scoringEngine";

export interface Tab1EngineConfig {
  minimumThreshold: number;
  direction: Direction;
}

/**
 * Engine configuration for each Tab 1 data point.
 * Targets are read at runtime:
 *   - Live data points: from thresholds.threshold_value
 *   - Illustrative data points: from kri_definitions.illustrative_target
 *
 * Minimum thresholds are illustrative until Rick confirms (8 June 2026 agenda).
 */
export const TAB1_ENGINE_CONFIG: Record<string, Tab1EngineConfig> = {
  sickness_absence: { minimumThreshold: 6.0, direction: "lowerIsBetter" },
  vacancy: { minimumThreshold: 12, direction: "lowerIsBetter" },
  training_compliance: { minimumThreshold: 60, direction: "higherIsBetter" },
  staff_engagement_score: { minimumThreshold: 5.0, direction: "higherIsBetter" },
  voluntary_turnover: { minimumThreshold: 16, direction: "lowerIsBetter" },
};
