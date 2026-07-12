// Pillar score roll-up — OQ-14 Option B.
// Each pillar score is the unweighted average of its scored indicator scores
// (indicators with no scored data points are excluded), rounded to a whole number.

import { PILLAR_CONFIG, resolveDataPoints, type PillarConfig } from "@/config/dataPoints";
import { displayScore, rollupIndicator } from "@/lib/scoringEngine";

export interface IndicatorScore {
  id: string;
  name: string;
  description: string;
  score: number | null; // rounded for display
  scoredCount: number;
  totalCount: number;
}

export interface PillarScores {
  id: PillarConfig["id"];
  name: string;
  score: number | null; // rounded average of scored indicators, or null
  indicators: IndicatorScore[];
}

export function computePillarScores(
  liveValues: Record<string, number | null | undefined>,
): PillarScores[] {
  return PILLAR_CONFIG.map((p) => {
    const indicators: IndicatorScore[] = p.indicators.map((ind) => {
      const dps = resolveDataPoints(ind, liveValues);
      const roll = rollupIndicator(dps);
      return {
        id: ind.id,
        name: ind.name,
        description: ind.description,
        score: displayScore(roll.score),
        scoredCount: roll.scoredCount,
        totalCount: roll.totalCount,
      };
    });
    const scored = indicators.filter((i) => i.score != null) as Array<IndicatorScore & { score: number }>;
    const score =
      scored.length === 0
        ? null
        : Math.round(scored.reduce((acc, i) => acc + i.score, 0) / scored.length);
    return { id: p.id, name: p.name, score, indicators };
  });
}

export function pillarScoreById(
  liveValues: Record<string, number | null | undefined>,
  pillarId: PillarConfig["id"],
): number | null {
  return computePillarScores(liveValues).find((p) => p.id === pillarId)?.score ?? null;
}

/**
 * Compute per-indicator scores for a pillar with an OVERRIDES map applied
 * (dataPointId → assumedValue). Same engine, same roll-up. Any indicator
 * whose data points are all unscored returns { score: null }.
 */
export function pillarIndicatorScoresWithOverrides(
  liveValues: Record<string, number | null | undefined>,
  pillarId: PillarConfig["id"],
  overrides: Record<string, number> = {},
): Array<{ id: string; name: string; score: number | null }> {
  const pillar = PILLAR_CONFIG.find((p) => p.id === pillarId);
  if (!pillar) return [];
  return pillar.indicators.map((ind) => {
    const dps = resolveDataPoints(ind, liveValues).map((dp) =>
      dp.id in overrides ? { ...dp, value: overrides[dp.id] } : dp,
    );
    const roll = rollupIndicator(dps);
    return { id: ind.id, name: ind.name, score: displayScore(roll.score) };
  });
}

/**
 * Compute a pillar score with an OVERRIDES map applied. Used by the AI Risk
 * Prediction "Simulate this intervention" flow. Everything else is scored
 * exactly as `computePillarScores` — same unweighted roll-up, same engine.
 */
export function pillarScoreWithOverride(
  liveValues: Record<string, number | null | undefined>,
  pillarId: PillarConfig["id"],
  overrides: Record<string, number>,
): number | null {
  const raw = pillarScoreWithOverrideRaw(liveValues, pillarId, overrides);
  return raw == null ? null : Math.round(raw);
}

/**
 * Same aggregation as `pillarScoreWithOverride` but returns the UNROUNDED
 * pillar mean, computed from raw (unrounded) indicator scores. Use this when
 * subtracting two pillar scores (e.g. simulation uplift) to avoid losing
 * fractional movement to indicator- and pillar-level Math.round.
 */
export function pillarScoreWithOverrideRaw(
  liveValues: Record<string, number | null | undefined>,
  pillarId: PillarConfig["id"],
  overrides: Record<string, number> = {},
): number | null {
  const pillar = PILLAR_CONFIG.find((p) => p.id === pillarId);
  if (!pillar) return null;
  const indicatorScores: number[] = [];
  for (const ind of pillar.indicators) {
    const dps = resolveDataPoints(ind, liveValues).map((dp) =>
      dp.id in overrides ? { ...dp, value: overrides[dp.id] } : dp,
    );
    const roll = rollupIndicator(dps);
    if (roll.score != null) indicatorScores.push(roll.score); // raw, pre-round
  }
  if (indicatorScores.length === 0) return null;
  return indicatorScores.reduce((a, b) => a + b, 0) / indicatorScores.length;
}
