// Static "Why this data point" rationale per KRI.
// Explains why the indicator belongs in the model — separate from the
// dynamic "Why it's flagged" status explanation. Editable here.

export const KRI_RATIONALE: Record<string, string> = {
  vacancy:
    "Shows our ability to attract new employees into operationally critical job families.",
  sickness_absence:
    "Tracks absence rates as a proxy indicator for personal resilience.",
  training_compliance:
    "Measures the share of staff up to date with mandatory training. Falling compliance indicates pressure on protected learning time and raises the risk of unsafe practice under stress.",
  staff_engagement_score:
    "Provides an indicator of the motivation, empowerment and adaptability of our people.",
  voluntary_turnover:
    "Shows the level to which we are maintaining knowledge and experience within these operationally critical job families.",
  talent_attraction_future:
    "Measures our ability to attract talent into the new job types and skills needed for areas we are moving into — distinct from today's critical services, because the target roles are different.",
  talent_attraction_today:
    "Measures our ability to attract talent into the roles and skills essential to running critical services now — distinct from future areas, because the target roles are different.",
};

export function getKriRationale(kriId: string): string | undefined {
  return KRI_RATIONALE[kriId];
}
