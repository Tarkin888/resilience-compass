export type ScenarioSeverity = "Critical" | "Warning" | "Watch";
export type ScenarioType = "Workforce shock" | "Demand surge" | "Strategic" | "Compliance";

export interface Scenario {
  id: string;
  title: string;
  severity: ScenarioSeverity;
  type: ScenarioType;
  description: string;
  baseScore: number;
  projectedScore: number;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "winter-surge",
    title: "Winter Surge — High Sickness Absence",
    severity: "Critical",
    type: "Demand surge",
    description:
      "Sickness absence rises sharply across nursing and AHP roles during a high-flu season; impact compounds if vacancy levels are already elevated.",
    baseScore: 54,
    projectedScore: 38,
  },
  {
    id: "nursing-shortage",
    title: "Critical Nursing Shortage",
    severity: "Critical",
    type: "Workforce shock",
    description:
      "International recruitment pipeline disrupted; agency reliance climbs; vacancy rate breaches 12%.",
    baseScore: 54,
    projectedScore: 41,
  },
  {
    id: "mass-attrition",
    title: "Mass Voluntary Attrition",
    severity: "Critical",
    type: "Workforce shock",
    description:
      "Retention failure across mid-career clinical staff; voluntary turnover reaches 18%.",
    baseScore: 54,
    projectedScore: 35,
  },
  {
    id: "junior-doctor-action",
    title: "Junior Doctor Industrial Action",
    severity: "Warning",
    type: "Workforce shock",
    description:
      "Multi-week walkout impacts elective and emergency rotas; agency cover required.",
    baseScore: 54,
    projectedScore: 47,
  },
  {
    id: "training-compliance",
    title: "Mandatory Training Compliance Failure",
    severity: "Warning",
    type: "Compliance",
    description:
      "Training compliance falls below 70% triggering CQC scrutiny; statutory training catch-up required.",
    baseScore: 54,
    projectedScore: 49,
  },
  {
    id: "workforce-reset",
    title: "Strategic Workforce Plan Reset",
    severity: "Watch",
    type: "Strategic",
    description:
      "Trust adopts a new workforce plan with revised establishment levels and skill-mix targets.",
    baseScore: 54,
    projectedScore: 60,
  },
];

export const SCENARIO_SEVERITY_STYLES: Record<ScenarioSeverity, { dot: string; chip: string }> = {
  Critical: { dot: "bg-red-600", chip: "bg-red-50 text-red-700 border-red-200" },
  Warning: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-800 border-amber-200" },
  Watch: { dot: "bg-blue-500", chip: "bg-blue-50 text-blue-700 border-blue-200" },
};
