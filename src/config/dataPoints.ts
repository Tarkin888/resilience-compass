// Data-point configuration per indicator per pillar.
// Targets, minimum thresholds and (where non-live) values are illustrative until
// Rick confirms — consistent with foundation document §5.4.
// Live values for `vacancy` and `sickness_absence` are supplied at runtime by
// resolveDataPointValues() below from useHumanCapitalData.

import type { DataPoint, DataPointConfig } from "@/lib/scoringEngine";

export type IndicatorId = string;

export interface IndicatorConfig {
  id: IndicatorId;
  name: string;
  /** Display sublabel — kept short, replaced at render time with "n of m scored". */
  description: string;
  dataPoints: Array<DataPointConfig & { illustrativeValue?: number | null; liveKriId?: string }>;
}

export interface PillarConfig {
  id: "financial" | "operational" | "human" | "reputational" | "environmental";
  name: string;
  indicators: IndicatorConfig[];
}

// -----------------------------
// Human (Workforce) — Rick's case study pp. 6–8
// -----------------------------
// Human pillar — one indicator per Tab 1 KRI so the pillar dial, pillar-card
// header and dashboard header are computed from the same five KRI engine
// scores the user sees in Live Risk Alerts. Job Distribution is intentionally
// unscored (no data points) so the average excludes it.
const human: PillarConfig = {
  id: "human",
  name: "Human (Workforce)",
  indicators: [
    {
      id: "staff_vacancies",
      name: "Staff Vacancies",
      description: "Vacancy rate (live, NHS England)",
      dataPoints: [
        { id: "vacancy", name: "Vacancy rate", target: 8.5, minimumThreshold: 12, unit: "%", direction: "lowerIsBetter", source: "Live", liveKriId: "vacancy" },
      ],
    },
    {
      id: "sickness_absence",
      name: "Sickness Absence Rate",
      description: "Quarterly absence rate (live, NHS England)",
      dataPoints: [
        { id: "sickness_absence", name: "Sickness absence rate", target: 4.2, minimumThreshold: 6.0, unit: "%", direction: "lowerIsBetter", source: "Live", liveKriId: "sickness_absence" },
      ],
    },
    {
      id: "staff_engagement",
      name: "Staff Engagement Score",
      description: "Illustrative staff-survey score",
      dataPoints: [
        { id: "staff_engagement_score", name: "Staff engagement score", target: 7.5, minimumThreshold: 5.0, unit: "score", direction: "higherIsBetter", source: "Illustrative", illustrativeValue: 6.4 },
      ],
    },
    {
      id: "voluntary_turnover",
      name: "Voluntary Turnover",
      description: "Illustrative annualised turnover",
      dataPoints: [
        { id: "voluntary_turnover", name: "Voluntary turnover", target: 10, minimumThreshold: 16, unit: "%", direction: "lowerIsBetter", source: "Illustrative", illustrativeValue: 13.1 },
      ],
    },
    {
      id: "training_compliance",
      name: "Training Compliance",
      description: "Illustrative mandatory-training compliance",
      dataPoints: [
        { id: "training_compliance", name: "Training compliance", target: 95, minimumThreshold: 60, unit: "%", direction: "higherIsBetter", source: "Illustrative", illustrativeValue: 78 },
      ],
    },
    {
      id: "job_distribution",
      name: "Job Distribution",
      description: "Based on the future skills plan (data points to be confirmed)",
      dataPoints: [], // unscored — excluded from pillar average
    },
  ],
};

// -----------------------------
// Preview pillars — fully illustrative, labelled as such.
// Values chosen so indicator averages roughly match prior hand-entered display values.
// -----------------------------
function ill(id: string, name: string, target: number, minimumThreshold: number, unit: string, direction: "higherIsBetter" | "lowerIsBetter", value: number) {
  return { id, name, target, minimumThreshold, unit, direction, source: "Illustrative" as const, illustrativeValue: value };
}

const financial: PillarConfig = {
  id: "financial",
  name: "Financial",
  indicators: [
    { id: "liquidity", name: "Liquidity Headroom", description: "Cash reserves, working capital, credit facility", dataPoints: [
      ill("cash_reserves_days", "Cash reserves (days)", 60, 20, "days", "higherIsBetter", 46),
      ill("working_capital_ratio", "Working capital ratio", 2.0, 1.0, "ratio", "higherIsBetter", 1.66),
      ill("credit_facility_used", "Credit facility utilisation", 20, 80, "%", "lowerIsBetter", 40),
    ]},
    { id: "cost_flex", name: "Cost Base Flexibility", description: "Fixed vs variable, supplier terms, pay mix, agency spend", dataPoints: [
      ill("variable_cost_share", "Variable cost share", 45, 25, "%", "higherIsBetter", 38),
      ill("supplier_terms_days", "Avg supplier payment terms", 60, 30, "days", "higherIsBetter", 50),
      ill("agency_pay_share", "Agency pay share", 4, 10, "%", "lowerIsBetter", 6),
      ill("pay_mix_flex", "Pay mix flexibility index", 70, 40, "score", "higherIsBetter", 60),
    ]},
    { id: "capex", name: "Capital Investment Capacity", description: "CDEL utilisation, backlog maintenance, project pipeline", dataPoints: [
      ill("cdel_utilisation", "CDEL utilisation", 95, 70, "%", "higherIsBetter", 86),
      ill("backlog_maintenance", "Backlog maintenance (£m)", 5, 30, "£m", "lowerIsBetter", 13.5),
      ill("pipeline_coverage", "Project pipeline coverage", 110, 80, "%", "higherIsBetter", 100),
    ]},
  ],
};

const operational: PillarConfig = {
  id: "operational",
  name: "Operational",
  indicators: [
    { id: "service_continuity", name: "Service Continuity", description: "Downtime, BCP coverage, single points of failure, recovery time", dataPoints: [
      ill("downtime_hours", "Unplanned downtime (hrs/mo)", 2, 12, "hrs", "lowerIsBetter", 5.4),
      ill("bcp_coverage", "BCP coverage of critical services", 100, 80, "%", "higherIsBetter", 93),
      ill("spof_count", "Single points of failure", 0, 8, "count", "lowerIsBetter", 3),
      ill("recovery_time_h", "Mean recovery time", 2, 12, "hrs", "lowerIsBetter", 5.4),
    ]},
    { id: "supply_chain", name: "Supply Chain Resilience", description: "Supplier concentration, stockholding, lead times", dataPoints: [
      ill("supplier_concentration", "Top-3 supplier concentration", 30, 70, "%", "lowerIsBetter", 44),
      ill("stockholding_days", "Critical stockholding", 30, 7, "days", "higherIsBetter", 22),
      ill("lead_time_days", "Avg supplier lead time", 7, 30, "days", "lowerIsBetter", 15),
    ]},
    { id: "estate", name: "Estate & Asset Reliability", description: "Critical asset age, planned maintenance, incident rate", dataPoints: [
      ill("asset_age", "Critical asset average age", 8, 20, "yrs", "lowerIsBetter", 12),
      ill("planned_maint_pct", "Planned vs reactive maintenance", 80, 50, "%", "higherIsBetter", 70),
      ill("estate_incident_rate", "Estate incidents per quarter", 2, 12, "count", "lowerIsBetter", 5),
    ]},
  ],
};

const reputational: PillarConfig = {
  id: "reputational",
  name: "Reputational",
  indicators: [
    { id: "stakeholder_trust", name: "Stakeholder Trust", description: "Regulator standing, public sentiment, partner relationships", dataPoints: [
      ill("regulator_rating", "Regulator standing", 4, 2, "rating 0-4", "higherIsBetter", 3.4),
      ill("public_sentiment", "Public sentiment index", 70, 40, "score", "higherIsBetter", 62),
      ill("partner_health", "Partner relationship health", 80, 50, "score", "higherIsBetter", 72),
    ]},
    { id: "brand_media", name: "Brand & Media Position", description: "Share of voice, sentiment trend, crisis exposure", dataPoints: [
      ill("share_of_voice", "Share of voice", 25, 10, "%", "higherIsBetter", 21),
      ill("media_sentiment", "Media sentiment trend", 65, 40, "score", "higherIsBetter", 58),
      ill("crisis_exposure", "Crisis exposure incidents", 1, 6, "count", "lowerIsBetter", 2),
    ]},
    { id: "voice", name: "Patient & Staff Voice", description: "FFT, complaints, staff survey advocacy", dataPoints: [
      ill("fft_score", "Friends & Family Test", 95, 80, "%", "higherIsBetter", 91),
      ill("complaints_rate", "Complaints per 1,000 contacts", 1, 5, "rate", "lowerIsBetter", 2.1),
      ill("staff_advocacy", "Staff survey advocacy", 70, 45, "%", "higherIsBetter", 63),
    ]},
  ],
};

const environmental: PillarConfig = {
  id: "environmental",
  name: "Environmental",
  indicators: [
    { id: "carbon", name: "Carbon & Energy", description: "Scope 1+2, energy intensity, renewable share", dataPoints: [
      ill("scope12_kt", "Scope 1+2 emissions (ktCO2e)", 8, 16, "kt", "lowerIsBetter", 13),
      ill("energy_intensity", "Energy intensity (kWh/m²)", 250, 450, "kWh/m²", "lowerIsBetter", 378),
      ill("renewable_share", "Renewable share of energy", 60, 20, "%", "higherIsBetter", 34),
    ]},
    { id: "climate", name: "Climate Adaptation", description: "Flood/heat exposure, adaptation plan, critical site risk", dataPoints: [
      ill("site_climate_risk", "Critical sites at high climate risk", 0, 5, "count", "lowerIsBetter", 3),
      ill("adaptation_plan", "Adaptation plan completeness", 100, 50, "%", "higherIsBetter", 68),
      ill("heat_exposure_days", "Heat-stress days/yr forecast", 10, 40, "days", "lowerIsBetter", 29),
    ]},
    { id: "resource", name: "Resource & Waste", description: "Waste intensity, recycling rate, water use", dataPoints: [
      ill("waste_intensity", "Waste intensity (kg/bed-day)", 4, 9, "kg", "lowerIsBetter", 7.2),
      ill("recycling_rate", "Recycling rate", 60, 25, "%", "higherIsBetter", 38),
      ill("water_use", "Water use (m³/bed-day)", 0.4, 0.9, "m³", "lowerIsBetter", 0.72),
    ]},
  ],
};

export const PILLAR_CONFIG: PillarConfig[] = [financial, operational, human, reputational, environmental];

/**
 * Resolve configured data points into runtime DataPoints by injecting live values
 * for entries that reference a `liveKriId`.
 */
export function resolveDataPoints(
  indicator: IndicatorConfig,
  liveValues: Record<string, number | null | undefined>,
): DataPoint[] {
  return indicator.dataPoints.map((dp) => {
    const value = dp.liveKriId ? liveValues[dp.liveKriId] ?? null : dp.illustrativeValue ?? null;
    const { illustrativeValue: _iv, liveKriId: _lk, ...rest } = dp;
    return { ...rest, value };
  });
}
