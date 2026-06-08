// SPC (statistical-process-control) classifier for normalised-score series.
// Pattern: NHSE "Making Data Count" / Shewhart XmR chart.
// Higher score = better (engine normalises both higher- and lower-is-better KRIs
// onto the same direction), so a downward special cause is always "Worsening".

export type SpcDirection =
  | "Improving"
  | "Worsening"
  | "Steady"
  | "Establishing baseline";

export interface SpcResult {
  direction: SpcDirection;
  /** Mean of the available points (or null if fewer than 2). */
  mean: number | null;
  /** Upper control limit, mean + 2.66 × mean(moving range). */
  ucl: number | null;
  /** Lower control limit, mean − 2.66 × mean(moving range). */
  lcl: number | null;
  /** Number of points used. */
  points: number;
  /** Human-readable basis for the verdict. Suitable for a tooltip. */
  tooltip: string;
}

const SPC_CONSTANT = 2.66; // XmR conventional constant (~3σ from average moving range)
const MIN_POINTS = 8;
const RUN_LENGTH = 7;

export function classifyTrend(series: number[]): SpcResult {
  const n = series.length;
  if (n < MIN_POINTS) {
    return {
      direction: "Establishing baseline",
      mean: n > 0 ? avg(series) : null,
      ucl: null,
      lcl: null,
      points: n,
      tooltip: `Establishing baseline — ${n} data point${n === 1 ? "" : "s"} so far; at least ${MIN_POINTS} needed for SPC.`,
    };
  }

  const mean = avg(series);
  const ranges: number[] = [];
  for (let i = 1; i < n; i++) ranges.push(Math.abs(series[i] - series[i - 1]));
  const mr = avg(ranges);
  const ucl = mean + SPC_CONSTANT * mr;
  const lcl = mean - SPC_CONSTANT * mr;

  // Special-cause: any point outside control limits.
  const anyAbove = series.some((v) => v > ucl);
  const anyBelow = series.some((v) => v < lcl);

  // Run rule: last N points all the same side of the mean.
  const tail = series.slice(-RUN_LENGTH);
  const allAboveMean = tail.length === RUN_LENGTH && tail.every((v) => v > mean);
  const allBelowMean = tail.length === RUN_LENGTH && tail.every((v) => v < mean);

  // Monotonic run rule: last N points strictly increasing / decreasing.
  let monoUp = tail.length === RUN_LENGTH;
  let monoDown = tail.length === RUN_LENGTH;
  for (let i = 1; i < tail.length; i++) {
    if (tail[i] <= tail[i - 1]) monoUp = false;
    if (tail[i] >= tail[i - 1]) monoDown = false;
  }

  const worsening = anyBelow || allBelowMean || monoDown;
  const improving = anyAbove || allAboveMean || monoUp;

  // If both fire (rare on noisy data), the most recent direction wins.
  let direction: SpcDirection = "Steady";
  let reason = `common-cause variation across ${n} readings (NHS Making Data Count).`;
  if (worsening && !improving) {
    direction = "Worsening";
    reason = anyBelow
      ? `a point below the lower control limit across ${n} readings.`
      : allBelowMean
        ? `${RUN_LENGTH} consecutive readings below the mean.`
        : `${RUN_LENGTH} consecutive falling readings.`;
  } else if (improving && !worsening) {
    direction = "Improving";
    reason = anyAbove
      ? `a point above the upper control limit across ${n} readings.`
      : allAboveMean
        ? `${RUN_LENGTH} consecutive readings above the mean.`
        : `${RUN_LENGTH} consecutive rising readings.`;
  } else if (worsening && improving) {
    // tie-break on direction of the most recent move
    direction = series[n - 1] < series[n - 2] ? "Worsening" : "Improving";
    reason = `mixed signals; resolved by the most recent change.`;
  }

  return {
    direction,
    mean,
    ucl,
    lcl,
    points: n,
    tooltip: `${direction} — ${reason}`,
  };
}

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function spcChipClasses(direction: SpcDirection): string {
  switch (direction) {
    case "Improving":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "Worsening":
      return "border-red-200 bg-red-50 text-red-800";
    case "Steady":
      return "border-slate-200 bg-slate-50 text-slate-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-500";
  }
}
