// Pure calculation helpers for the Human Capital pillar.
// All functions are pure and side-effect free.

export type Status = "Critical" | "Warning" | "Watch" | "OK";
export type Trend = "improving" | "steady" | "worsening";

export type ThresholdType = "less_than";

/**
 * Map a measured value against a threshold to a severity status.
 *
 * Bands (less_than = "lower is better"):
 *   OK       value <= threshold
 *   Watch    threshold < value <= threshold * 1.05
 *   Warning  threshold * 1.05 < value <= threshold * 1.20
 *   Critical value > threshold * 1.20
 */
export function getStatus(value: number, threshold: number, type: ThresholdType = "less_than"): Status {
  if (type !== "less_than") {
    throw new Error(`Unsupported threshold type: ${type}`);
  }
  if (value <= threshold) return "OK";
  if (value <= threshold * 1.05) return "Watch";
  if (value <= threshold * 1.2) return "Warning";
  return "Critical";
}

/**
 * Compare current vs prior reading.
 * `lowerIsBetter = true` means a fall in the value is "improving".
 * Movement of <= 0.05 percentage points is "steady".
 */
export function getTrend(current: number, prior: number, lowerIsBetter: boolean): Trend {
  const delta = current - prior;
  if (Math.abs(delta) <= 0.05) return "steady";
  const fell = delta < 0;
  const improved = lowerIsBetter ? fell : !fell;
  return improved ? "improving" : "worsening";
}

export interface KriDefLite {
  display_name: string;
}
export interface CaptureLite {
  edition_label: string;
  headline_value: number;
  headline_unit?: string | null;
  prior_value?: number | null;
}
export interface ThresholdLite {
  threshold_value: number;
  units: string;
  qualifier_label?: string | null;
}

/**
 * Build a plain-English alert narrative for a live KRI.
 */
export function buildAlertNarrative(
  publicationName: string,
  capture: CaptureLite,
  threshold: ThresholdLite,
  lowerIsBetter = true,
): string {
  const unit = threshold.units === "percent" ? "%" : ` ${threshold.units}`;
  const value = capture.headline_value;
  const trend =
    capture.prior_value == null
      ? "no prior reading"
      : getTrend(value, capture.prior_value, lowerIsBetter);
  const qualifier = threshold.qualifier_label ? ` (${threshold.qualifier_label})` : "";
  return `Source: ${publicationName}, ${capture.edition_label}. Target: <${threshold.threshold_value}${unit}${qualifier}. Actual: ${value.toFixed(1)}${unit}. Trend: ${trend}.`;
}
