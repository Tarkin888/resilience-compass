export type ScenarioSeverity = "Critical" | "Warning" | "Watch";
export type ScenarioType = "Workforce shock" | "Demand surge" | "Strategic" | "Compliance";

export interface Scenario {
  id: string;
  title: string;
  severity: ScenarioSeverity;
  type: ScenarioType;
  description: string;
  /** Hypothetical raw values keyed by live kri_id. Illustrative assumptions —
   * easy to edit, to be confirmed with the methodology owner. */
  inputs: Record<string, number>;
  /** One-sentence plain-English explanation of why each non-headline input
   * moves under this preset, keyed by live kri_id. Illustrative reasoning. */
  fieldRationale?: Partial<Record<string, string>>;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "winter-surge",
    title: "Winter Surge — High Sickness Absence",
    severity: "Critical",
    type: "Demand surge",
    description:
      "Sickness absence rises sharply across nursing and AHP roles during a high-flu season; impact compounds if vacancy levels are already elevated.",
    inputs: { vacancy: 7.5, sickness_absence: 7.8 },
    fieldRationale: {
      vacancy:
        "Staff Vacancies rises modestly because winter pressure slows recruitment and prompts some fixed-term leavers, even though sickness absence is the headline driver in this scenario.",
    },
  },
  {
    id: "nursing-shortage",
    title: "Critical Nursing Shortage",
    severity: "Critical",
    type: "Workforce shock",
    description:
      "International recruitment pipeline disrupted; agency reliance climbs; vacancy rate breaches 12%.",
    inputs: { vacancy: 12.5, sickness_absence: 5.8 },
    fieldRationale: {
      sickness_absence:
        "Sickness Absence Rate rises because the remaining nursing staff absorb the vacancy gap through extra shifts, increasing fatigue-related absence.",
    },
  },
  {
    id: "mass-attrition",
    title: "Mass Voluntary Attrition",
    severity: "Critical",
    type: "Workforce shock",
    description:
      "Retention failure across mid-career clinical staff; voluntary turnover reaches 18%.",
    inputs: { vacancy: 11.0, sickness_absence: 6.2 },
    fieldRationale: {
      sickness_absence:
        "Sickness Absence Rate rises as workload transfers to a shrinking mid-career cohort and stress-related absence increases while backfill lags attrition.",
    },
  },
  {
    id: "junior-doctor-action",
    title: "Junior Doctor Industrial Action",
    severity: "Warning",
    type: "Workforce shock",
    description:
      "Multi-week walkout impacts elective and emergency rotas; agency cover required.",
    inputs: { vacancy: 9.0, sickness_absence: 6.0 },
    fieldRationale: {
      sickness_absence:
        "Sickness Absence Rate rises during and after the walkout as stretched rotas and agency-covered gaps increase short-term absence among remaining staff.",
    },
  },
  {
    id: "training-compliance",
    title: "Mandatory Training Compliance Failure",
    severity: "Warning",
    type: "Compliance",
    description:
      "Training compliance falls below 70% triggering CQC scrutiny; statutory training catch-up required.",
    inputs: { vacancy: 6.9, sickness_absence: 5.5 },
    fieldRationale: {
      vacancy:
        "Staff Vacancies moves only slightly, as time diverted to statutory training catch-up delays recruitment and induction activity.",
      sickness_absence:
        "Sickness Absence Rate edges up as staff release for catch-up training concentrates clinical workload on those remaining on shift.",
    },
  },
  {
    id: "workforce-reset",
    title: "Strategic Workforce Plan Reset",
    severity: "Watch",
    type: "Strategic",
    description:
      "Trust adopts a new workforce plan with revised establishment levels and skill-mix targets.",
    inputs: { vacancy: 5.5, sickness_absence: 4.4 },
    fieldRationale: {
      sickness_absence:
        "Sickness Absence Rate improves because revised establishment levels and a better skill mix reduce sustained workload pressure on frontline teams.",
    },
  },
];

export const SCENARIO_SEVERITY_STYLES: Record<ScenarioSeverity, { dot: string; chip: string }> = {
  Critical: { dot: "bg-red-600", chip: "bg-red-50 text-red-700 border-red-200" },
  Warning: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-800 border-amber-200" },
  Watch: { dot: "bg-blue-500", chip: "bg-blue-50 text-blue-700 border-blue-200" },
};
