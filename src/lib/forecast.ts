// Forecasting layer for normalised-score series.
// Restraint-first: short horizon, SPC-aware method, mandatory uncertainty band,
// no forecast without sufficient history. Higher score = better (engine already
// normalises direction). Reuses spc.ts for the process-state classification.
//
// Methods:
//  - "mean+limits"     : common-cause series → hold mean flat, band = SPC limits
//  - "trend"           : special-cause trend → project linear slope, widening band
//  - "seasonal-naive"  : ≥24 monthly points → same month last year + recent YoY shift
//  - "none"            : <8 points or no usable signal
//
// Pure functions — no I/O. Deterministic from inputs.

import { classifyTrend } from "./spc";

export type Cadence = "monthly" | "quarterly";

export type ForecastMethod =
  | "mean+limits"
  | "trend"
  | "seasonal-naive"
  | "none";

export interface ForecastPoint {
  /** ISO date (YYYY-MM-DD) at the start of the period. */
  date: string;
  /** Central projection (rounded). */
  value: number;
  /** Lower bound of the uncertainty band (rounded, clamped 0..100). */
  lower: number;
  /** Upper bound of the uncertainty band (rounded, clamped 0..100). */
  upper: number;
}

export interface ForecastResult {
  method: ForecastMethod;
  /** Horizon-length array of forward projections. Empty when method = "none". */
  points: ForecastPoint[];
  /** Human-readable explanation suitable for a caption / tooltip. */
  caption: string;
}

const MIN_POINTS = 8;
const SEASONAL_MIN = 24;
const DEFAULT_HORIZON = 3;

export interface ForecastInput {
  /** Normalised scores in chronological order. */
  scores: number[];
  /** ISO dates aligned to scores. */
  dates: string[];
  cadence: Cadence;
  /** Number of future periods. Capped at 3 by design. */
  horizon?: number;
}

export function forecastSeries(input: ForecastInput): ForecastResult {
  const horizon = Math.min(input.horizon ?? DEFAULT_HORIZON, DEFAULT_HORIZON);
  const { scores, dates, cadence } = input;
  const n = scores.length;

  if (n < MIN_POINTS) {
    return {
      method: "none",
      points: [],
      caption: `Forecast unavailable — at least ${MIN_POINTS} historical points required (currently ${n}).`,
    };
  }

  const spc = classifyTrend(scores);
  const lastDate = dates[n - 1];

  // Seasonal-naive (monthly only, ≥24 pts so we have two full years).
  if (cadence === "monthly" && n >= SEASONAL_MIN) {
    return seasonalNaive(scores, lastDate, horizon);
  }

  if (spc.direction === "Improving" || spc.direction === "Worsening") {
    return trendForecast(scores, lastDate, cadence, horizon, spc.direction);
  }

  // Default: stable / steady — hold mean, band = SPC limits.
  return meanForecast(scores, lastDate, cadence, horizon, spc.mean, spc.ucl, spc.lcl);
}

function meanForecast(
  scores: number[],
  lastDate: string,
  cadence: Cadence,
  horizon: number,
  mean: number | null,
  ucl: number | null,
  lcl: number | null,
): ForecastResult {
  const m = mean ?? scores[scores.length - 1];
  const upper = ucl ?? m;
  const lower = lcl ?? m;
  const points: ForecastPoint[] = [];
  for (let i = 1; i <= horizon; i++) {
    points.push({
      date: addPeriods(lastDate, i, cadence),
      value: clampRound(m),
      lower: clampRound(lower),
      upper: clampRound(upper),
    });
  }
  return {
    method: "mean+limits",
    points,
    caption: `Projection: next ${horizon} ${unit(cadence, horizon)}, process mean held flat within control limits (NHS Making Data Count).`,
  };
}

function trendForecast(
  scores: number[],
  lastDate: string,
  cadence: Cadence,
  horizon: number,
  direction: "Improving" | "Worsening",
): ForecastResult {
  // Slope from the recent run (last min(n, 6) points).
  const tailLen = Math.min(scores.length, 6);
  const tail = scores.slice(-tailLen);
  const slope = linearSlope(tail);
  const last = scores[scores.length - 1];

  // Band from residual std of the tail vs its linear fit, widening with step.
  const residSd = residualStd(tail);
  const points: ForecastPoint[] = [];
  for (let i = 1; i <= horizon; i++) {
    const v = last + slope * i;
    // Band widens roughly with sqrt(i) — convention from naive forecast intervals.
    const halfWidth = 1.96 * residSd * Math.sqrt(i);
    points.push({
      date: addPeriods(lastDate, i, cadence),
      value: clampRound(v),
      lower: clampRound(v - halfWidth),
      upper: clampRound(v + halfWidth),
    });
  }
  return {
    method: "trend",
    points,
    caption: `Projection: next ${horizon} ${unit(cadence, horizon)}, recent ${direction.toLowerCase()} trend continued; band widens with horizon. Conditional on the trend holding.`,
  };
}

function seasonalNaive(
  scores: number[],
  lastDate: string,
  horizon: number,
): ForecastResult {
  const n = scores.length;
  const recent = scores.slice(n - 12);
  const prior = scores.slice(n - 24, n - 12);
  const levelShift = avg(recent) - avg(prior);

  // Residuals = same-month YoY differences minus the level shift.
  const resid: number[] = [];
  for (let i = 0; i < 12; i++) resid.push(recent[i] - prior[i] - levelShift);
  const sd = std(resid);

  const points: ForecastPoint[] = [];
  for (let i = 1; i <= horizon; i++) {
    // Same month, one year ago: index from the end of `scores` going back 12 then forward i-1.
    const sameMonthLastYear = scores[n - 12 + (i - 1)];
    const v = sameMonthLastYear + levelShift;
    const halfWidth = 1.96 * sd * Math.sqrt(i);
    points.push({
      date: addPeriods(lastDate, i, "monthly"),
      value: clampRound(v),
      lower: clampRound(v - halfWidth),
      upper: clampRound(v + halfWidth),
    });
  }
  return {
    method: "seasonal-naive",
    points,
    caption: `Projection: next ${horizon} months, seasonal baseline (same month last year + recent year-on-year shift). Shaded area is the expected range, not a guarantee.`,
  };
}

// ----------------- helpers -----------------

function addPeriods(iso: string, n: number, cadence: Cadence): string {
  const d = new Date(iso + "T00:00:00Z");
  const months = cadence === "monthly" ? n : n * 3;
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = avg(xs);
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

function linearSlope(xs: number[]): number {
  // Least-squares slope with x = 0..n-1.
  const n = xs.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = avg(xs);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (xs[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function residualStd(xs: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const slope = linearSlope(xs);
  const intercept = avg(xs) - slope * ((n - 1) / 2);
  const resid: number[] = [];
  for (let i = 0; i < n; i++) resid.push(xs[i] - (intercept + slope * i));
  return std(resid);
}

function clampRound(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function unit(cadence: Cadence, horizon: number): string {
  if (cadence === "monthly") return horizon === 1 ? "month" : "months";
  return horizon === 1 ? "quarter" : "quarters";
}
