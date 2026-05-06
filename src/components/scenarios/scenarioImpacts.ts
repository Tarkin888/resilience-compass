export type KriUnit = "percent" | "score";
export type KriSourceType = "live" | "illustrative";
export type KriStatus = "Critical" | "Warning" | "Watch";

export interface KriImpactRow {
  kri: string;
  unit: KriUnit;
  source: KriSourceType;
  current: number;
  projected: number;
  status: KriStatus;
}

export interface ScenarioImpact {
  rows: KriImpactRow[];
  narrative: string;
}

// Sort order matches Tab 1: Sickness → Vacancies → Training → Turnover → Engagement
const KRI_ORDER = [
  "Sickness Absence Rate",
  "Staff Vacancies",
  "Training Compliance",
  "Voluntary Turnover",
  "Staff Engagement Score",
] as const;

const KRI_META: Record<
  (typeof KRI_ORDER)[number],
  { unit: KriUnit; source: KriSourceType }
> = {
  "Sickness Absence Rate": { unit: "percent", source: "live" },
  "Staff Vacancies": { unit: "percent", source: "live" },
  "Training Compliance": { unit: "percent", source: "illustrative" },
  "Voluntary Turnover": { unit: "percent", source: "illustrative" },
  "Staff Engagement Score": { unit: "score", source: "illustrative" },
};

function row(
  kri: (typeof KRI_ORDER)[number],
  current: number,
  projected: number,
  status: KriStatus,
): KriImpactRow {
  return { kri, ...KRI_META[kri], current, projected, status };
}

export const SCENARIO_IMPACTS: Record<string, ScenarioImpact> = {
  "winter-surge": {
    rows: [
      row("Sickness Absence Rate", 5.2, 8.5, "Critical"),
      row("Staff Vacancies", 9.1, 10.4, "Critical"),
      row("Training Compliance", 78.0, 70.0, "Warning"),
      row("Voluntary Turnover", 13.1, 13.1, "Warning"),
      row("Staff Engagement Score", 6.4, 5.8, "Watch"),
    ],
    narrative:
      "Under this scenario, the Human Capital score falls from 54 to 38 — entering the Critical range. The dominant driver is a 63% rise in sickness absence, with knock-on effects on training compliance and staff engagement as workforce pressure compounds.",
  },
  "nursing-shortage": {
    rows: [
      row("Sickness Absence Rate", 5.2, 5.5, "Critical"),
      row("Staff Vacancies", 9.1, 12.3, "Critical"),
      row("Training Compliance", 78.0, 76.0, "Warning"),
      row("Voluntary Turnover", 13.1, 14.2, "Warning"),
      row("Staff Engagement Score", 6.4, 5.5, "Watch"),
    ],
    narrative:
      "Under this scenario, the Human Capital score falls from 54 to 41 — at the lower edge of the At Risk range. The vacancy rate breaches 12%, driving sharp deteriorations in voluntary turnover and engagement as remaining staff carry the gap.",
  },
  "mass-attrition": {
    rows: [
      row("Sickness Absence Rate", 5.2, 6.0, "Critical"),
      row("Staff Vacancies", 9.1, 11.8, "Critical"),
      row("Training Compliance", 78.0, 65.0, "Warning"),
      row("Voluntary Turnover", 13.1, 18.0, "Warning"),
      row("Staff Engagement Score", 6.4, 4.9, "Watch"),
    ],
    narrative:
      "Under this scenario, the Human Capital score falls from 54 to 35 — Critical. Voluntary turnover reaches 18% across mid-career clinical staff, pulling vacancy and engagement sharply down and compromising training compliance.",
  },
  "junior-doctor-action": {
    rows: [
      row("Sickness Absence Rate", 5.2, 5.4, "Critical"),
      row("Staff Vacancies", 9.1, 9.5, "Warning"),
      row("Training Compliance", 78.0, 75.0, "Warning"),
      row("Voluntary Turnover", 13.1, 13.5, "Warning"),
      row("Staff Engagement Score", 6.4, 5.9, "Watch"),
    ],
    narrative:
      "Under this scenario, the Human Capital score falls from 54 to 47 — within the At Risk range. Impact is contained by agency cover, but engagement and training compliance soften under the strain of stretched rotas.",
  },
  "training-compliance": {
    rows: [
      row("Sickness Absence Rate", 5.2, 5.2, "Critical"),
      row("Staff Vacancies", 9.1, 9.1, "Warning"),
      row("Training Compliance", 78.0, 65.0, "Warning"),
      row("Voluntary Turnover", 13.1, 13.1, "Warning"),
      row("Staff Engagement Score", 6.4, 6.2, "Watch"),
    ],
    narrative:
      "Under this scenario, the Human Capital score falls from 54 to 49 — At Risk. Training compliance drops below 70%, triggering CQC scrutiny and a statutory training catch-up obligation.",
  },
  "workforce-reset": {
    rows: [
      row("Sickness Absence Rate", 5.2, 4.8, "Watch"),
      row("Staff Vacancies", 9.1, 7.8, "Watch"),
      row("Training Compliance", 78.0, 88.0, "Watch"),
      row("Voluntary Turnover", 13.1, 11.0, "Warning"),
      row("Staff Engagement Score", 6.4, 7.0, "Watch"),
    ],
    narrative:
      "Under this scenario, the Human Capital score rises from 54 to 60 — moving into the Stable range. Improvements span vacancy, sickness, training and engagement as the new workforce plan takes effect.",
  },
};

export type ScoreBandLabel = "Critical" | "At Risk" | "Stable" | "Strong";

export interface ScoreBand {
  label: ScoreBandLabel;
  min: number;
  max: number;
  fill: string;
  text: string;
  swatch: string;
}

export const SCORE_BANDS: ScoreBand[] = [
  { label: "Critical", min: 0, max: 40, fill: "bg-red-100", text: "text-red-700", swatch: "bg-red-400" },
  { label: "At Risk", min: 41, max: 55, fill: "bg-amber-100", text: "text-amber-800", swatch: "bg-amber-400" },
  { label: "Stable", min: 56, max: 70, fill: "bg-blue-100", text: "text-blue-700", swatch: "bg-blue-400" },
  { label: "Strong", min: 71, max: 100, fill: "bg-emerald-100", text: "text-emerald-700", swatch: "bg-emerald-400" },
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
