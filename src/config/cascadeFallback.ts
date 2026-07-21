// Deterministic cascade fallback matrix used when the live AI call is
// unavailable or returns unusable JSON. Keeps the demo stable — Prompt 27.
// Signed indicative deltas per non-workforce pillar per scenario type.
// UK English throughout.

import type { ScenarioType } from "@/components/scenarios/scenarios";

export type CascadePillarId = "financial" | "operational" | "reputational" | "environmental";

export interface CascadeFallbackItem {
  pillarId: CascadePillarId;
  delta: number;
  rationale: string;
}

const FINANCIAL_LABEL = "financial";
const OPERATIONAL_LABEL = "operational";
const REPUTATIONAL_LABEL = "reputational";
const ENVIRONMENTAL_LABEL = "environmental";

export const CASCADE_FALLBACK: Record<ScenarioType, CascadeFallbackItem[]> = {
  "Workforce shock": [
    { pillarId: FINANCIAL_LABEL, delta: -4, rationale: "Agency and premium-pay spend rises to backfill vacancies." },
    { pillarId: OPERATIONAL_LABEL, delta: -6, rationale: "Reduced rota cover pressures elective throughput and single-points-of-failure widen." },
    { pillarId: REPUTATIONAL_LABEL, delta: -4, rationale: "Cancelled activity and slower response times risk patient-experience feedback." },
    { pillarId: ENVIRONMENTAL_LABEL, delta: -1, rationale: "Marginal — sustainability programmes typically deprioritised under staffing stress." },
  ],
  "Demand surge": [
    { pillarId: FINANCIAL_LABEL, delta: -5, rationale: "Escalation costs and mutual-aid spending erode liquidity headroom." },
    { pillarId: OPERATIONAL_LABEL, delta: -7, rationale: "Service continuity strained as capacity is redirected to acute demand." },
    { pillarId: REPUTATIONAL_LABEL, delta: -3, rationale: "Public and regulator scrutiny rises as waits lengthen." },
    { pillarId: ENVIRONMENTAL_LABEL, delta: -2, rationale: "Higher throughput lifts energy and waste intensity in the short term." },
  ],
  Strategic: [
    { pillarId: FINANCIAL_LABEL, delta: 2, rationale: "Rebalanced establishment and skill-mix improves cost flexibility over time." },
    { pillarId: OPERATIONAL_LABEL, delta: 1, rationale: "Clearer role mix supports service continuity once implemented." },
    { pillarId: REPUTATIONAL_LABEL, delta: 2, rationale: "Visible workforce plan strengthens stakeholder trust." },
    { pillarId: ENVIRONMENTAL_LABEL, delta: 0, rationale: "No material short-term change to environmental footprint." },
  ],
  Compliance: [
    { pillarId: FINANCIAL_LABEL, delta: -2, rationale: "Catch-up training and remediation costs draw on operating budgets." },
    { pillarId: OPERATIONAL_LABEL, delta: -3, rationale: "Compliance backlogs constrain rostering flexibility until cleared." },
    { pillarId: REPUTATIONAL_LABEL, delta: -6, rationale: "CQC or regulator attention weighs on public and partner confidence." },
    { pillarId: ENVIRONMENTAL_LABEL, delta: 0, rationale: "No material environmental effect from a compliance-driven event." },
  ],
};

export function fallbackForType(type: ScenarioType | undefined): CascadeFallbackItem[] {
  if (type && CASCADE_FALLBACK[type]) return CASCADE_FALLBACK[type];
  return CASCADE_FALLBACK["Workforce shock"];
}
