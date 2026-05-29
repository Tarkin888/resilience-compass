import { TAB1_ENGINE_CONFIG } from "@/config/tab1EngineConfig";
import type { Direction } from "@/lib/scoringEngine";

export type KriUnit = "percent" | "score";
export type KriSourceType = "live" | "illustrative";

export interface KriImpactRow {
  kri: string;
  unit: KriUnit;
  source: KriSourceType;
  current: number;
  projected: number;
  target: number;
  minimumThreshold: number;
  direction: Direction;
}

export interface ScenarioImpact {
  rows: KriImpactRow[];
  /** Narrative body — the leading score-change sentence is generated at render time. */
  narrative: string;
  horizon: string;
  inputs: string;
}

// Sort order matches Tab 1: Sickness → Vacancies → Training → Turnover → Engagement.
// Each display name is mapped to its Tab 1 kri_id, so {target, minimumThreshold,
// direction} are read from TAB1_ENGINE_CONFIG — the single source of truth shared
// with the Tab 1 badge.
const KRI_ORDER = [
  "Sickness Absence Rate",
  "Staff Vacancies",
  "Training Compliance",
  "Voluntary Turnover",
  "Staff Engagement Score",
] as const;

const KRI_DISPLAY_META: Record<
  (typeof KRI_ORDER)[number],
  { unit: KriUnit; source: KriSourceType; kriId: keyof typeof TAB1_ENGINE_CONFIG }
> = {
  "Sickness Absence Rate": { unit: "percent", source: "live", kriId: "sickness_absence" },
  "Staff Vacancies": { unit: "percent", source: "live", kriId: "vacancy" },
  "Training Compliance": { unit: "percent", source: "illustrative", kriId: "training_compliance" },
  "Voluntary Turnover": { unit: "percent", source: "illustrative", kriId: "voluntary_turnover" },
  "Staff Engagement Score": { unit: "score", source: "illustrative", kriId: "staff_engagement_score" },
};

function row(
  kri: (typeof KRI_ORDER)[number],
  current: number,
  projected: number,
): KriImpactRow {
  const meta = KRI_DISPLAY_META[kri];
  const engine = TAB1_ENGINE_CONFIG[meta.kriId];
  return {
    kri,
    unit: meta.unit,
    source: meta.source,
    current,
    projected,
    target: engine.target,
    minimumThreshold: engine.minimumThreshold,
    direction: engine.direction,
  };
}

export const SCENARIO_IMPACTS: Record<string, ScenarioImpact> = {
  "winter-surge": {
    rows: [
      row("Sickness Absence Rate", 5.2, 8.5),
      row("Staff Vacancies", 9.1, 9.1),
      row("Training Compliance", 78.0, 65.0),
      row("Voluntary Turnover", 13.1, 16.4),
      row("Staff Engagement Score", 6.4, 5.7),
    ],
    narrative:
      "Under this scenario, the Human Capital score falls from 54 to 38 — crossing into the Red band (below the minimum threshold of 25). The primary driver is a 63% increase in sickness absence, with knock-on impacts on training compliance and staff engagement. Vacancy rate is held constant in this scenario.",
    horizon: "3-month horizon",
    inputs:
      "High-flu winter season modelled across nursing and AHP roles. Sickness absence uplift applied over a 12-week peak period (Dec–Feb). Vacancy rate held at current level. Modelled across the five Human Capital data points using the agreed pillar weights.",
  },
  "nursing-shortage": {
    rows: [
      row("Sickness Absence Rate", 5.2, 5.5),
      row("Staff Vacancies", 9.1, 12.3),
      row("Training Compliance", 78.0, 76.0),
      row("Voluntary Turnover", 13.1, 14.2),
      row("Staff Engagement Score", 6.4, 5.5),
    ],
    narrative:
      "Under this scenario, the Human Capital score falls from 54 to 41 — at the lower edge of the Amber band. The vacancy rate breaches 12%, driving sharp deteriorations in voluntary turnover and engagement as remaining staff carry the gap.",
    horizon: "6-month horizon",
    inputs:
      "International recruitment pipeline disrupted for two consecutive quarters. Agency reliance assumed at twice baseline. Vacancy rate breaches 12%; knock-on effects modelled through turnover and engagement using the agreed pillar weights.",
  },
  "mass-attrition": {
    rows: [
      row("Sickness Absence Rate", 5.2, 6.0),
      row("Staff Vacancies", 9.1, 11.8),
      row("Training Compliance", 78.0, 65.0),
      row("Voluntary Turnover", 13.1, 18.0),
      row("Staff Engagement Score", 6.4, 4.9),
    ],
    narrative:
      "Under this scenario, the Human Capital score falls from 54 to 35 — Red band. Voluntary turnover reaches 18% across mid-career clinical staff, pulling vacancy and engagement sharply down and compromising training compliance.",
    horizon: "12-month horizon",
    inputs:
      "Retention failure concentrated in mid-career clinical staff. Voluntary turnover modelled at 18% over the year. Vacancy backfill assumed to lag attrition by one quarter. All five Human Capital data points reweighted under the agreed pillar weights.",
  },
  "junior-doctor-action": {
    rows: [
      row("Sickness Absence Rate", 5.2, 5.4),
      row("Staff Vacancies", 9.1, 9.5),
      row("Training Compliance", 78.0, 75.0),
      row("Voluntary Turnover", 13.1, 13.5),
      row("Staff Engagement Score", 6.4, 5.9),
    ],
    narrative:
      "Under this scenario, the Human Capital score falls from 54 to 47 — within the Amber band. Impact is contained by agency cover, but engagement and training compliance soften under the strain of stretched rotas.",
    horizon: "3-month horizon",
    inputs:
      "Multi-week junior doctor walkout impacting elective and emergency rotas. Agency cover deployed across affected specialties. Modelled across the five Human Capital data points using the agreed pillar weights.",
  },
  "training-compliance": {
    rows: [
      row("Sickness Absence Rate", 5.2, 5.2),
      row("Staff Vacancies", 9.1, 9.1),
      row("Training Compliance", 78.0, 65.0),
      row("Voluntary Turnover", 13.1, 13.1),
      row("Staff Engagement Score", 6.4, 6.2),
    ],
    narrative:
      "Under this scenario, the Human Capital score falls from 54 to 49 — Amber band. Training compliance drops below 70%, triggering CQC scrutiny and a statutory training catch-up obligation.",
    horizon: "6-month horizon",
    inputs:
      "Training compliance falls below 70% across statutory modules. CQC scrutiny triggered; catch-up obligation applied. Other data points held at baseline. Modelled across the five Human Capital data points using the agreed pillar weights.",
  },
  "workforce-reset": {
    rows: [
      row("Sickness Absence Rate", 5.2, 4.8),
      row("Staff Vacancies", 9.1, 7.8),
      row("Training Compliance", 78.0, 88.0),
      row("Voluntary Turnover", 13.1, 11.0),
      row("Staff Engagement Score", 6.4, 7.0),
    ],
    narrative:
      "Under this scenario, the Human Capital score rises from 54 to 60 — moving into the Amber band. Improvements span vacancy, sickness, training and engagement as the new workforce plan takes effect.",
    horizon: "12-month horizon",
    inputs:
      "Revised establishment levels and skill-mix targets phased in across 12 months. Bank-staff framework deployed across 60% of departments. Improvements modelled across the five Human Capital data points using the agreed pillar weights.",
  },
};


export type ScoreBandLabel = "Red" | "Amber" | "Green";

export interface ScoreBand {
  label: ScoreBandLabel;
  min: number;
  max: number;
  fill: string;
  text: string;
  swatch: string;
}

export const SCORE_BANDS: ScoreBand[] = [
  { label: "Red", min: 0, max: 24, fill: "bg-red-100", text: "text-red-700", swatch: "bg-red-400" },
  { label: "Amber", min: 25, max: 74, fill: "bg-amber-100", text: "text-amber-800", swatch: "bg-amber-400" },
  { label: "Green", min: 75, max: 100, fill: "bg-emerald-100", text: "text-emerald-700", swatch: "bg-emerald-400" },
];

export function bandForScore(score: number): ScoreBand {
  return SCORE_BANDS.find((b) => score >= b.min && score <= b.max) ?? SCORE_BANDS[1];
}

export function formatKriValue(row: KriImpactRow, value: number): string {
  if (row.unit === "percent") return `${value.toFixed(1)}%`;
  return value.toFixed(1);
}

export function formatKriDelta(row: KriImpactRow): string {
  const delta = row.projected - row.current;
  const sign = delta > 0 ? "+" : delta < 0 ? "" : "";
  const abs = Math.abs(delta);
  if (row.unit === "percent") {
    if (delta === 0) return "0.0pp";
    return `${sign}${delta.toFixed(1)}pp`;
  }
  if (delta === 0) return "0.0";
  return `${sign}${delta.toFixed(1)}`;
}
