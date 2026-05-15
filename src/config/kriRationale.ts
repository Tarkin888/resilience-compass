// Static "Why this data point" rationale per KRI.
// Explains why the indicator belongs in the model — separate from the
// dynamic "Why it's flagged" status explanation. Editable here.

export const KRI_RATIONALE: Record<string, string> = {
  vacancy:
    "Measures the proportion of funded posts currently unfilled. A sustained high vacancy rate erodes workforce capacity and increases reliance on temporary staff and overtime, reducing resilience.",
  sickness_absence:
    "Measures working time lost to sickness. Rising absence signals workforce strain and reduces the Trust's capacity to absorb shocks.",
  training_compliance:
    "Measures the share of staff up to date with mandatory training. Falling compliance indicates pressure on protected learning time and raises the risk of unsafe practice under stress.",
  staff_engagement_score:
    "Measures how connected and motivated staff feel at work. Lower engagement is a leading indicator of turnover, absence and reduced discretionary effort — all of which weaken resilience.",
  voluntary_turnover:
    "Measures the rate at which staff choose to leave. Sustained high voluntary turnover drains institutional knowledge and increases recruitment load, reducing the workforce's ability to absorb shocks.",
};

export function getKriRationale(kriId: string): string | undefined {
  return KRI_RATIONALE[kriId];
}
