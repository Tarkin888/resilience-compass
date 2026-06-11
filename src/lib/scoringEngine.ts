// Normalisation scoring engine — Rick's case study, page 5.
// Maps a data point's current value onto a 0–100 operating range
// where the minimum threshold sits at 25 and the target sits at 75.

export type Direction = "higherIsBetter" | "lowerIsBetter";
export type DataSource = "Live" | "Illustrative";

export interface DataPointConfig {
  id: string;
  name: string;
  target: number;
  minimumThreshold: number;
  unit: string;
  direction: Direction;
  source: DataSource;
}

export interface DataPoint extends DataPointConfig {
  /** Current measured value. `null` / `undefined` = no reading. */
  value: number | null | undefined;
}

export type Rag = "red" | "amber" | "green";

export const RAG_COLORS: Record<Rag, string> = {
  red: "#DC2626",
  amber: "#F59E0B",
  green: "#16A34A",
};

/**
 * Normalise a value onto the 0–100 operating range.
 *  score = 25 + 50 × (value − minimumThreshold) ÷ (target − minimumThreshold)
 * Clamped to [0, 100]. Returns `null` if config is invalid (target === minimumThreshold).
 *
 * Works for both directions automatically — for lowerIsBetter, target < minimumThreshold,
 * so (target − minimumThreshold) is negative and the maths still places target at 75
 * and threshold at 25.
 */
export function normaliseScore(
  value: number | null | undefined,
  target: number,
  minimumThreshold: number,
): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (target === minimumThreshold) return null;
  const raw = 25 + 50 * ((value - minimumThreshold) / (target - minimumThreshold));
  return Math.max(0, Math.min(100, raw));
}

/** RAG band for a 0–100 score (Rick's bands): ≤35 red, 36–66 amber, ≥67 green. */
export function ragBand(score: number): Rag {
  if (score <= 35) return "red";
  if (score <= 66) return "amber";
  return "green";
}

export interface BandInfo {
  name: "Red" | "Amber" | "Green";
  parenthetical: string;
}

/**
 * Returns the Rick band for a 0–100 score, with a short parenthetical
 * explanation suitable for narrative copy.
 */
export function bandFor(score: number): BandInfo {
  if (score <= 35) return { name: "Red", parenthetical: "below the operating range" };
  if (score <= 66) return { name: "Amber", parenthetical: "within the operating range, below target" };
  return { name: "Green", parenthetical: "at or above target" };
}

export interface DataPointScore {
  config: DataPoint;
  score: number | null; // null = not scored (missing value or invalid config)
  invalidConfig: boolean;
}

/** Score a data point. Logs a console warning if the config is invalid. */
export function scoreDataPoint(dp: DataPoint): DataPointScore {
  const invalidConfig = dp.target === dp.minimumThreshold;
  if (invalidConfig) {
    // build-visible flag
    // eslint-disable-next-line no-console
    console.warn(
      `[scoringEngine] Invalid config for data point "${dp.id}": target === minimumThreshold (${dp.target}).`,
    );
  }
  const score = invalidConfig ? null : normaliseScore(dp.value, dp.target, dp.minimumThreshold);
  return { config: dp, score, invalidConfig };
}

export interface IndicatorRollup {
  /** Unweighted mean of scored data points, or null if none scored. */
  score: number | null;
  scoredCount: number;
  totalCount: number;
  scores: DataPointScore[];
}

/** Roll up data points into an indicator score (simple unweighted average). */
export function rollupIndicator(dataPoints: DataPoint[]): IndicatorRollup {
  const scores = dataPoints.map(scoreDataPoint);
  const valid = scores.filter((s) => s.score != null) as Array<DataPointScore & { score: number }>;
  const score =
    valid.length === 0 ? null : valid.reduce((acc, s) => acc + s.score, 0) / valid.length;
  return {
    score,
    scoredCount: valid.length,
    totalCount: dataPoints.length,
    scores,
  };
}

/** Round for display (whole numbers everywhere a score is shown). */
export function displayScore(score: number | null): number | null {
  return score == null ? null : Math.round(score);
}
