// Shared trend assessment for board / strategic views.
// Computes a directional label over a rolling window to avoid
// flipping on short-term noise.

export type TrendDirection = "Improving" | "Worsening" | "Stable" | "Insufficient data";

export interface TrendAssessment {
  direction: TrendDirection;
  /** Number of data points used (after truncating to the window). */
  pointsUsed: number;
  /** Average of the more recent half minus the earlier half, on a 0–100 scale. */
  delta: number;
  /** One-line definition suitable for a tooltip. */
  tooltip: string;
  /** Short caveat if data is shorter than the full window. */
  caveat?: string;
}

export interface TrendOptions {
  /** Window length in months (default 6). */
  windowMonths?: number;
  /** Minimum movement (points on 0–100 scale) before label flips off Stable. */
  minDelta?: number;
  /** Cadence label for caveat copy: "months" or "quarters". */
  cadence?: "months" | "quarters";
}

const TOOLTIPS: Record<TrendDirection, string> = {
  Improving:
    "Improving: score has moved towards the target by at least 2 points over the assessment window.",
  Worsening:
    "Worsening: score has moved towards the threshold by at least 2 points over the assessment window.",
  Stable:
    "Stable: no meaningful directional change (less than 2 points) over the assessment window.",
  "Insufficient data":
    "Insufficient data: at least three data points are needed to assess a trend.",
};

/**
 * Assess a trend over the last N values on a 0–100 scale.
 * - Compares the mean of the more recent half against the mean of the earlier half.
 * - Requires a minimum movement (default 2 points) to leave "Stable".
 * - With fewer than 3 points returns "Insufficient data".
 */
export function assessTrend(
  series: number[],
  options: TrendOptions = {},
): TrendAssessment {
  const { windowMonths = 6, minDelta = 2, cadence = "months" } = options;

  if (!series || series.length < 3) {
    return {
      direction: "Insufficient data",
      pointsUsed: series?.length ?? 0,
      delta: 0,
      tooltip: TOOLTIPS["Insufficient data"],
      caveat:
        series && series.length > 0
          ? `Based on ${series.length} ${cadence} of data`
          : undefined,
    };
  }

  const window = series.slice(-windowMonths);
  const n = window.length;
  const half = Math.floor(n / 2);
  const earlier = window.slice(0, half);
  const recent = window.slice(n - half);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const delta = mean(recent) - mean(earlier);

  let direction: TrendDirection;
  if (Math.abs(delta) < minDelta) direction = "Stable";
  else if (delta > 0) direction = "Improving";
  else direction = "Worsening";

  const caveat =
    n < windowMonths ? `Based on ${n} ${cadence} of data` : undefined;

  return {
    direction,
    pointsUsed: n,
    delta,
    tooltip: TOOLTIPS[direction],
    caveat,
  };
}

export function trendBadgeClasses(direction: TrendDirection): string {
  switch (direction) {
    case "Improving":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "Worsening":
      return "border-red-200 bg-red-50 text-red-800";
    case "Stable":
      return "border-slate-200 bg-slate-50 text-slate-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-500";
  }
}
