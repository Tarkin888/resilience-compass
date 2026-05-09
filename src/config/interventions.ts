// Hardcoded intervention data for the demo. Sourced from the ResilienceC
// Human Capital Research Bank placeholder. Each entry must keep its
// stable RC-HC-INT-XXX ID — once the production research bank lands,
// readMoreUrl will resolve per-entry instead of the shared placeholder.

export type EvidenceWeight = "High" | "Medium" | "Low";

export type Intervention = {
  id: string;
  title: string;
  description: string;
  upliftMinPts: number;
  upliftMaxPts: number;
  timeToImpactMonths: number;
  evidence: EvidenceWeight;
  reference: string;
  evidenceSummary: string;
  readMoreUrl: string;
};

export type InterventionsByKri = Record<string, Intervention[]>;

const RESEARCH_BANK_URL =
  "https://www.notion.so/35b80f7847e08157893bfb788a85cab1";

const EVIDENCE_RANK: Record<EvidenceWeight, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

export const INTERVENTIONS: InterventionsByKri = {
  sickness_absence: [
    {
      id: "RC-HC-INT-014",
      title: "Manager-led return-to-work conversations",
      description:
        "Mandatory structured return-to-work meeting after every absence episode, owned by line managers.",
      upliftMinPts: 3,
      upliftMaxPts: 5,
      timeToImpactMonths: 3,
      evidence: "High",
      reference:
        "NHS Employers (2023) — Health and wellbeing framework: managing sickness absence.",
      evidenceSummary:
        "Trusts running consistent return-to-work conversations report a 0.5–0.9 percentage-point reduction in monthly absence rate within two quarters.",
      readMoreUrl: RESEARCH_BANK_URL,
    },
    {
      id: "RC-HC-INT-021",
      title: "Occupational health fast-track referral",
      description:
        "Referral SLA cut to 5 working days for staff in long-term absence or with repeat short-term episodes.",
      upliftMinPts: 2,
      upliftMaxPts: 4,
      timeToImpactMonths: 4,
      evidence: "High",
      reference:
        "Society of Occupational Medicine (2022) — Value of occupational health in the NHS.",
      evidenceSummary:
        "Faster OH referral reduces long-term absence duration by 18–25%, with measurable absence-rate improvement within 4–6 months.",
      readMoreUrl: RESEARCH_BANK_URL,
    },
    {
      id: "RC-HC-INT-027",
      title: "Targeted ward-level absence response group",
      description:
        "Stand up a winter pressures workforce response group focused on the 5 highest-absence wards.",
      upliftMinPts: 2,
      upliftMaxPts: 3,
      timeToImpactMonths: 2,
      evidence: "Medium",
      reference:
        "NHS England (2024) — Winter workforce resilience playbook.",
      evidenceSummary:
        "Localised ward-level interventions show faster impact than trust-wide programmes; quoted improvements 0.3–0.6 pp within one quarter.",
      readMoreUrl: RESEARCH_BANK_URL,
    },
    {
      id: "RC-HC-INT-033",
      title: "Mental health first-aider rollout",
      description:
        "Train one mental-health first-aider per 25 staff across clinical and non-clinical teams.",
      upliftMinPts: 1,
      upliftMaxPts: 3,
      timeToImpactMonths: 6,
      evidence: "Medium",
      reference:
        "MHFA England (2023) — Workplace mental health impact study.",
      evidenceSummary:
        "Trusts with full MHFA coverage report 12–18% lower stress-related absence over 6–12 months.",
      readMoreUrl: RESEARCH_BANK_URL,
    },
    {
      id: "RC-HC-INT-039",
      title: "Flexible-working request fast-track",
      description:
        "10-day decision SLA on flexible-working requests, with manager training on default-yes framing.",
      upliftMinPts: 1,
      upliftMaxPts: 2,
      timeToImpactMonths: 5,
      evidence: "Low",
      reference:
        "CIPD (2023) — Flexible working and the NHS workforce.",
      evidenceSummary:
        "Correlation observed between flexible-working uptake and reduced short-term absence; causal evidence remains limited.",
      readMoreUrl: RESEARCH_BANK_URL,
    },
  ],
  vacancy: [
    {
      id: "RC-HC-INT-052",
      title: "Executive-level recruitment escalation",
      description:
        "Escalate critical-staff-group recruitment (nursing, AHP) to the executive team with weekly tracking.",
      upliftMinPts: 3,
      upliftMaxPts: 5,
      timeToImpactMonths: 4,
      evidence: "High",
      reference:
        "NHS England (2023) — Long term workforce plan: recruitment levers.",
      evidenceSummary:
        "Board-sponsored recruitment drives close vacancy gaps 30–40% faster than business-as-usual.",
      readMoreUrl: RESEARCH_BANK_URL,
    },
    {
      id: "RC-HC-INT-058",
      title: "International recruitment cohort",
      description:
        "Run a controlled international recruitment cohort with pastoral and OSCE support pre-arrival.",
      upliftMinPts: 2,
      upliftMaxPts: 4,
      timeToImpactMonths: 6,
      evidence: "Medium",
      reference:
        "NHS Employers (2024) — Code of practice for international recruitment.",
      evidenceSummary:
        "Structured cohorts achieve 85%+ retention at 12 months and materially close vacancy gaps in nursing.",
      readMoreUrl: RESEARCH_BANK_URL,
    },
    {
      id: "RC-HC-INT-064",
      title: "Retention pay premia review",
      description:
        "Review retention pay premia for hard-to-fill specialties against regional benchmark.",
      upliftMinPts: 1,
      upliftMaxPts: 3,
      timeToImpactMonths: 5,
      evidence: "Medium",
      reference:
        "NHS Pay Review Body (2024) — Recruitment and retention premia.",
      evidenceSummary:
        "Targeted premia reduce regional vacancy variance by 1.5–3 percentage points within two cycles.",
      readMoreUrl: RESEARCH_BANK_URL,
    },
  ],
  voluntary_turnover: [
    {
      id: "RC-HC-INT-072",
      title: "Stay-interview programme",
      description:
        "Quarterly stay-interviews for hard-to-fill roles, owned by line managers, recorded in workforce system.",
      upliftMinPts: 2,
      upliftMaxPts: 4,
      timeToImpactMonths: 4,
      evidence: "High",
      reference:
        "King's Fund (2023) — Retention and the NHS workforce.",
      evidenceSummary:
        "Stay-interview programmes consistently associated with 15–25% reduction in voluntary turnover within 6 months.",
      readMoreUrl: RESEARCH_BANK_URL,
    },
    {
      id: "RC-HC-INT-079",
      title: "First-year career conversation",
      description:
        "Mandatory career and development conversation at month 9 for all new joiners.",
      upliftMinPts: 1,
      upliftMaxPts: 3,
      timeToImpactMonths: 6,
      evidence: "Medium",
      reference:
        "NHS England (2023) — People promise: belonging and growth.",
      evidenceSummary:
        "Early-tenure conversations correlate with a 10–15% reduction in first-year leavers.",
      readMoreUrl: RESEARCH_BANK_URL,
    },
    {
      id: "RC-HC-INT-085",
      title: "Exit-interview themed action loop",
      description:
        "Quarterly exit-interview review with named directorate owner and tracked actions.",
      upliftMinPts: 1,
      upliftMaxPts: 2,
      timeToImpactMonths: 5,
      evidence: "Low",
      reference:
        "CIPD (2022) — Exit interview practice.",
      evidenceSummary:
        "Action-loop closure modestly improves turnover but evidence is largely observational.",
      readMoreUrl: RESEARCH_BANK_URL,
    },
  ],
  bank_spend: [
    {
      id: "RC-HC-INT-091",
      title: "Bank-staff framework deployment",
      description:
        "Move agency spend onto the trust's own staff bank with capped agency tier.",
      upliftMinPts: 3,
      upliftMaxPts: 5,
      timeToImpactMonths: 3,
      evidence: "High",
      reference:
        "NHS England (2024) — Reducing agency spend: trust playbook.",
      evidenceSummary:
        "Trusts that consolidated bank-first reduced agency spend by 25–40% within two quarters.",
      readMoreUrl: RESEARCH_BANK_URL,
    },
    {
      id: "RC-HC-INT-097",
      title: "Collaborative bank with neighbouring trusts",
      description:
        "Join or stand up a regional collaborative bank to share flexible-workforce capacity.",
      upliftMinPts: 2,
      upliftMaxPts: 3,
      timeToImpactMonths: 6,
      evidence: "Medium",
      reference:
        "NHS Improvement (2022) — Collaborative bank models.",
      evidenceSummary:
        "Regional collaborative banks reduce off-framework agency reliance by 15–20%.",
      readMoreUrl: RESEARCH_BANK_URL,
    },
    {
      id: "RC-HC-INT-103",
      title: "E-rostering optimisation review",
      description:
        "Audit e-rostering practice against NHSE optimisation checklist; close top three gaps.",
      upliftMinPts: 1,
      upliftMaxPts: 3,
      timeToImpactMonths: 4,
      evidence: "Medium",
      reference:
        "NHS England (2023) — E-rostering levels of attainment.",
      evidenceSummary:
        "Trusts at Level 5–7 attainment show 8–12% lower bank-and-agency spend than Level 1–3.",
      readMoreUrl: RESEARCH_BANK_URL,
    },
  ],
  staff_engagement_score: [
    {
      id: "RC-HC-INT-112",
      title: "Exec-sponsored team listening sessions",
      description:
        "Local listening sessions with directorate exec sponsor and tracked commitments.",
      upliftMinPts: 2,
      upliftMaxPts: 4,
      timeToImpactMonths: 6,
      evidence: "High",
      reference:
        "NHS Staff Survey Coordination Centre (2023) — Engagement drivers.",
      evidenceSummary:
        "Trusts running structured listening cycles improve engagement score by 0.2–0.4 points year-on-year.",
      readMoreUrl: RESEARCH_BANK_URL,
    },
    {
      id: "RC-HC-INT-118",
      title: "Civility and respect programme",
      description:
        "Roll out the NHS civility and respect toolkit across all directorates with named champions.",
      upliftMinPts: 1,
      upliftMaxPts: 3,
      timeToImpactMonths: 9,
      evidence: "Medium",
      reference:
        "Social Partnership Forum (2022) — Civility and respect.",
      evidenceSummary:
        "Sustained civility programmes correlate with improved engagement and reduced bullying-related leavers.",
      readMoreUrl: RESEARCH_BANK_URL,
    },
    {
      id: "RC-HC-INT-124",
      title: "Manager 1:1 cadence guarantee",
      description:
        "Guarantee monthly 1:1 between every staff member and their line manager, tracked in workforce system.",
      upliftMinPts: 1,
      upliftMaxPts: 2,
      timeToImpactMonths: 6,
      evidence: "Low",
      reference:
        "King's Fund (2023) — Compassionate leadership in the NHS.",
      evidenceSummary:
        "1:1 cadence is a known engagement driver; isolated impact is difficult to attribute.",
      readMoreUrl: RESEARCH_BANK_URL,
    },
  ],
};

export function getInterventionsForKri(kriId: string): Intervention[] {
  const list = INTERVENTIONS[kriId] ?? [];
  return [...list].sort((a, b) => {
    if (b.upliftMaxPts !== a.upliftMaxPts) return b.upliftMaxPts - a.upliftMaxPts;
    const ev = EVIDENCE_RANK[b.evidence] - EVIDENCE_RANK[a.evidence];
    if (ev !== 0) return ev;
    return a.timeToImpactMonths - b.timeToImpactMonths;
  });
}
