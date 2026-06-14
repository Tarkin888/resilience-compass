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
  },
  {
    id: "nursing-shortage",
    title: "Critical Nursing Shortage",
    severity: "Critical",
    type: "Workforce shock",
    description:
      "International recruitment pipeline disrupted; agency reliance climbs; vacancy rate breaches 12%.",
    inputs: { vacancy: 12.5, sickness_absence: 5.8 },
  },
  {
    id: "mass-attrition",
    title: "Mass Voluntary Attrition",
    severity: "Critical",
    type: "Workforce shock",
    description:
      "Retention failure across mid-career clinical staff; voluntary turnover reaches 18%.",
    inputs: { vacancy: 11.0, sickness_absence: 6.2 },
  },
  {
    id: "junior-doctor-action",
    title: "Junior Doctor Industrial Action",
    severity: "Warning",
    type: "Workforce shock",
    description:
      "Multi-week walkout impacts elective and emergency rotas; agency cover required.",
    inputs: { vacancy: 9.0, sickness_absence: 6.0 },
  },
  {
    id: "training-compliance",
    title: "Mandatory Training Compliance Failure",
    severity: "Warning",
    type: "Compliance",
    description:
      "Training compliance falls below 70% triggering CQC scrutiny; statutory training catch-up required.",
    inputs: { vacancy: 6.9, sickness_absence: 5.5 },
  },
  {
    id: "workforce-reset",
    title: "Strategic Workforce Plan Reset",
    severity: "Watch",
    type: "Strategic",
    description:
      "Trust adopts a new workforce plan with revised establishment levels and skill-mix targets.",
    inputs: { vacancy: 5.5, sickness_absence: 4.4 },
  },
];

export const SCENARIO_SEVERITY_STYLES: Record<ScenarioSeverity, { dot: string; chip: string }> = {
  Critical: { dot: "bg-red-600", chip: "bg-red-50 text-red-700 border-red-200" },
  Warning: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-800 border-amber-200" },
  Watch: { dot: "bg-blue-500", chip: "bg-blue-50 text-blue-700 border-blue-200" },
};
