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
