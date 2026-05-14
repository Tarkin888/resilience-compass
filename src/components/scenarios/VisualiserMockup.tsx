import { DataSourceChip, type LiveTooltipPayload } from "@/components/DataSourceChip";
import { ScoreScale } from "@/components/ScoreScale";
import {
  SCENARIO_IMPACTS,
  type KriImpactRow,
  type ScenarioImpact,
} from "./scenarioImpacts";
import { SCENARIO_SEVERITY_STYLES, type Scenario } from "./scenarios";

interface Props {
  scenario: Scenario | null;
  onBrowseScenarios: () => void;
}

const BASELINE_SCORE = 54;

// KRIs where lower is better
const LOWER_BETTER = new Set([
  "Sickness Absence Rate",
  "Staff Vacancies",
  "Voluntary Turnover",
]);

const LIVE_KRIS = new Set(["Sickness Absence Rate", "Staff Vacancies"]);

// Live tooltip payloads (illustrative editions for chip tooltip)
const LIVE_PAYLOAD: Record<string, LiveTooltipPayload> = {
  "Sickness Absence Rate": {
    publicationName: "NHS Sickness Absence Rates",
    editionLabel: "January 2026",
    capturedAtFormatted: "11 May 2026",
    url: "https://digital.nhs.uk/data-and-information/publications/statistical/nhs-sickness-absence-rates",
  },
  "Staff Vacancies": {
    publicationName: "NHS Vacancy Statistics",
    editionLabel: "Q3 2025/26",
    capturedAtFormatted: "11 May 2026",
    url: "https://digital.nhs.uk/data-and-information/publications/statistical/nhs-vacancies-survey",
  },
};

export const VisualiserMockup = ({ scenario, onBrowseScenarios }: Props) => {
  return (
    <div className="space-y-5 text-base">
      <DataSourceChip variant="mockup" />
      {scenario ? (
        <LoadedView scenario={scenario} onBrowseScenarios={onBrowseScenarios} />
      ) : (
        <EmptyState onBrowse={onBrowseScenarios} />
      )}
    </div>
  );
};

const EmptyState = ({ onBrowse }: { onBrowse: () => void }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <h2 className="text-lg font-medium text-slate-900">No scenario loaded</h2>
    <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
      Load a scenario from the Scenario Testing Library to visualise its projected impact on the
      Human Capital score and the underlying KRIs.
    </p>
    <button
      type="button"
      onClick={onBrowse}
      className="mt-5 inline-flex items-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
    >
      Browse scenarios
    </button>
  </section>
);

const LoadedView = ({
  scenario,
  onBrowseScenarios,
}: {
  scenario: Scenario;
  onBrowseScenarios: () => void;
}) => {
  const impact: ScenarioImpact | undefined = SCENARIO_IMPACTS[scenario.id];
  const projected = scenario.projectedScore;
  const delta = projected - BASELINE_SCORE;

  const improving = delta > 0;
  const declining = delta < 0;
  const deltaTone = improving ? "text-emerald-700" : declining ? "text-red-700" : "text-slate-600";
  const sevPill = SCENARIO_SEVERITY_STYLES[scenario.severity].chip;
  const deltaSign = delta > 0 ? "+" : delta < 0 ? "-" : "";
  const deltaAbs = Math.abs(delta);

  return (
    <>
      {/* Header band */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">Scenario loaded</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-medium leading-snug text-slate-900">{scenario.title}</h2>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${sevPill}`}>
                {scenario.severity}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {scenario.type}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onBrowseScenarios}
            className="shrink-0 text-sm font-medium text-brand hover:underline"
          >
            Load a different scenario →
          </button>
        </div>
      </section>

      {/* Score impact strip */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-10">
          <ScoreScale score={BASELINE_SCORE} size="compact" label="Baseline score" />
          <ScoreScale score={projected} size="compact" label="Projected score" />
        </div>
        <div className="mt-6 text-center">
          <span className={`font-mono text-sm ${deltaTone}`}>
            Estimated impact: {BASELINE_SCORE} → {projected} ({deltaSign}{deltaAbs})
          </span>
        </div>
      </section>

      {/* Before/after KRI table */}
      {impact && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">KRI</th>
                  <th className="py-2 px-3">Current</th>
                  <th className="py-2 px-3">Projected</th>
                  <th className="py-2 px-3">Δ</th>
                  <th className="py-2 pl-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {impact.rows.map((row) => (
                  <KriRow key={row.kri} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Narrative panel */}
      {impact && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Why this projection
          </div>
          <p className="mt-2 text-base leading-relaxed text-slate-700">{impact.narrative}</p>
          <p className="mt-4 text-sm italic text-slate-500">
            Projected values are illustrative for the 14 May demo. Calculation logic is built
            post-demo using the same rules-based engine as the AI Risk Prediction tab, with
            documented inputs, weights and intervention uplifts.
          </p>
        </section>
      )}
    </>
  );
};

const KriRow = ({ row }: { row: KriImpactRow }) => {
  const delta = row.projected - row.current;
  const lowerBetter = LOWER_BETTER.has(row.kri);
  const improved = lowerBetter ? delta < 0 : delta > 0;
  const worsened = lowerBetter ? delta > 0 : delta < 0;
  const deltaTone = improved
    ? "text-emerald-700"
    : worsened
      ? "text-red-700"
      : "text-slate-500";
  const sign = delta > 0 ? "+" : delta < 0 ? "-" : "";
  const absDelta = Math.abs(delta);
  const deltaText =
    row.unit === "percent"
      ? delta === 0
        ? "0.0 pp"
        : `${sign}${absDelta.toFixed(1)} pp`
      : delta === 0
        ? "0.0"
        : `${sign}${absDelta.toFixed(1)}`;

  const fmt = (v: number) => (row.unit === "percent" ? `${v.toFixed(1)}%` : v.toFixed(1));

  const statusStyles: Record<string, string> = {
    Critical: "bg-red-50 text-red-700 border-red-200",
    Warning: "bg-amber-50 text-amber-800 border-amber-200",
    Watch: "bg-blue-50 text-blue-700 border-blue-200",
  };

  const isLive = LIVE_KRIS.has(row.kri);

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-3 pr-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base text-slate-900">{row.kri}</span>
          {isLive ? (
            <DataSourceChip variant="live" payload={LIVE_PAYLOAD[row.kri]} />
          ) : (
            <DataSourceChip variant="illustrative" />
          )}
        </div>
      </td>
      <td className="py-3 px-3 text-base tabular-nums text-slate-700">{fmt(row.current)}</td>
      <td className="py-3 px-3 text-base tabular-nums text-slate-700">{fmt(row.projected)}</td>
      <td className={`py-3 px-3 font-mono text-sm ${deltaTone}`}>{deltaText}</td>
      <td className="py-3 pl-3">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyles[row.status]}`}
        >
          {row.status}
        </span>
      </td>
    </tr>
  );
};
