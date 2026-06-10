// Shared RAG band helper for pillar/indicator scores on the 0–100 operating range.
// Single source of truth for the red/amber/green palette used by the dial ring,
// headline numbers and pillar-detail headers. Keep these hex values in sync with
// RAG_COLORS in scoringEngine.ts.

export const RED = "#DC2626";
export const AMBER = "#F59E0B";
export const GREEN = "#16A34A";
export const GREY = "#94A3B8";

export type ScoreBand = "red" | "amber" | "green" | "unscored";

/** Band for a 0–100 score: <25 red, 25–75 amber, >75 green. */
export function scoreBand(score: number | null | undefined): ScoreBand {
  if (score == null || !Number.isFinite(score)) return "unscored";
  if (score < 25) return "red";
  if (score > 75) return "green";
  return "amber";
}

/** Hex colour for a 0–100 score, matching the app palette. */
export function scoreBandColor(score: number | null | undefined): string {
  switch (scoreBand(score)) {
    case "red":
      return RED;
    case "green":
      return GREEN;
    case "amber":
      return AMBER;
    default:
      return GREY;
  }
}
