// Hardcoded rule-based intervention suggestions per KRI for the demo.
// AI-generated narratives are deferred (OQ-10).

export const INTERVENTIONS: Record<string, string[]> = {
  vacancy: [
    "Escalate critical-staff-group recruitment to executive level",
    "Activate temporary staffing framework for nursing and AHP roles",
    "Review retention pay premia for hard-to-fill specialties",
  ],
  sickness_absence: [
    "Stand up winter pressures workforce response group",
    "Review occupational health referral capacity",
    "Run targeted manager-conversation training for high-absence wards",
  ],
  training_compliance: [
    "Mandatory training catch-up campaign — 30-day deadline",
  ],
  staff_engagement_score: [
    "Local team listening sessions, exec-sponsored",
  ],
  voluntary_turnover: [
    "Stay-interview programme for hard-to-fill roles",
  ],
};

export function getInterventions(kriId: string): string[] {
  return INTERVENTIONS[kriId] ?? [];
}
