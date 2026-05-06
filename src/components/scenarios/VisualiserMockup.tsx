import { Info, ArrowRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  SCENARIO_IMPACTS,
  SCORE_BANDS,
  bandForScore,
  formatKriDelta,
  formatKriValue,
  type KriImpactRow,
} from "./scenarioImpacts";
import { SCENARIO_SEVERITY_STYLES, type Scenario } from "./scenarios";

interface Props {
  scenario: Scenario | null;
  onBrowseScenarios: () => void;
}

const CURRENT_SCORE = 54;

export const VisualiserMockup = ({ scenario, onBrowseScenarios }: Props) => {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              role="button"
              aria-describedby="visualiser-mockup-tooltip"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Info size={12} aria-hidden />
              Mockup — not yet live
            </span>
          </TooltipTrigger>
          <TooltipContent id="visualiser-mockup-tooltip" role="tooltip" className="max-w-xs">
            This module is shown for the 14 May demo as a static preview. Functional build follows
            post-demo.
          </TooltipContent>
        </Tooltip>
      </div>

      {scenario ? (
        <LoadedView scenario={scenario} onBrowseScenarios={onBrowseScenarios} />
      ) : (
        <EmptyState onBrowseScenarios={onBrowseScenarios} />
      )}
    </div>
  );
};

const EmptyState = ({ onBrowseScenarios }: { onBrowseScenarios: () => void }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
    <h2 className="text-lg font-semibold text-slate-900">No scenario loaded</h2>
    <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
      Choose a scenario from the Scenario Testing Library to see its projected impact on the Human
      Capital score and individual KRIs.
    </p>
    <Button className="mt-6" onClick={onBrowseScenarios}>
      Browse scenarios
    </Button>
  </div>
);

const LoadedView = ({
  scenario,
  onBrowseScenarios,
}: {
  scenario: Scenario;
  onBrowseScenarios: () => void;
}) => {
  const impact = SCENARIO_IMPACTS[scenario.id];
  const sevStyles = SCENARIO_SEVERITY_STYLES[scenario.severity];
  const projected = scenario.projectedScore;
  const currentBand = bandForScore(CURRENT_SCORE);
  const projectedBand = bandForScore(projected);
  const delta = projected - CURRENT_SCORE;

  const arrowTint =
    delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : "text-slate-400";

  return (
    <div className="space-y-5">
      {/* 3.1 Header band */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Scenario loaded
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{scenario.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${sevStyles.chip}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${sevStyles.dot}`} aria-hidden />
                {scenario.severity}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {scenario.type}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onBrowseScenarios}
            className="text-sm font-medium text-brand hover:underline"
          >
            Load a different scenario →
          </button>
        </div>
      </div>

      {/* 3.2 Score impact strip */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold tabular-nums text-slate-900">{CURRENT_SCORE}</div>
            <div className={`mt-1 text-xs font-semibold ${currentBand.text}`}>
              ({currentBand.label})
            </div>
          </div>
          <ArrowRight size={28} className={arrowTint} aria-hidden />
          <div className="text-center">
            <div className="text-3xl font-bold tabular-nums text-slate-900">{projected}</div>
            <div className={`mt-1 text-xs font-semibold ${projectedBand.text}`}>
              ({projectedBand.label})
            </div>
          </div>
        </div>

        <ScoreBar current={CURRENT_SCORE} projected={projected} />

        <div className="mt-4 text-center font-mono text-sm tabular-nums text-slate-700">
          Estimated impact: {CURRENT_SCORE} → {projected} ({delta > 0 ? "+" : ""}
          {delta})
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {SCORE_BANDS.map((b) => (
            <div key={b.label} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${b.swatch}`} aria-hidden />
              <span className="text-xs text-slate-600">
                {b.label} ({b.min}–{b.max})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3.3 KRI before / after table */}
      {impact && <KriTable rows={impact.rows} />}

      {/* 3.4 Narrative */}
      {impact && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-6">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Why this projection
          </div>
          <p className="mt-2 text-sm text-slate-700">{impact.narrative}</p>
          <p className="mt-4 text-xs italic text-slate-500">
            Projected values are illustrative for the 14 May demo. Calculation logic is built
            post-demo.
          </p>
        </div>
      )}
    </div>
  );
};

const ScoreBar = ({ current, projected }: { current: number; projected: number }) => {
  return (
    <div className="relative mt-6 h-8 w-full">
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {SCORE_BANDS.map((b) => {
          const width = b.max - b.min + (b.min === 0 ? 0 : 1);
          // Bands are 0-40 (41 wide), 41-55 (15), 56-70 (15), 71-100 (30) → total 101.
          // Approximate by using max-min+1 normalised to 100.
          return (
            <div
              key={b.label}
              className={b.fill}
              style={{ width: `${width}%` }}
              aria-hidden
            />
          );
        })}
      </div>
      <Pip value={current} label={`${current}`} variant="current" />
      <Pip value={projected} label={`${projected}`} variant="projected" />
    </div>
  );
};

const Pip = ({
  value,
  label,
  variant,
}: {
  value: number;
  label: string;
  variant: "current" | "projected";
}) => {
  const left = `${Math.max(0, Math.min(100, value))}%`;
  const colour = variant === "current" ? "bg-slate-900" : "bg-brand";
  const labelPos = variant === "current" ? "-top-5" : "top-5";
  return (
    <div
      className="absolute top-0 -translate-x-1/2"
      style={{ left }}
      aria-label={`${variant} score ${value}`}
    >
      <div className={`h-3 w-1 rounded-full ${colour}`} />
      <div
        className={`absolute ${labelPos} left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] tabular-nums text-slate-700`}
      >
        {label}
      </div>
    </div>
  );
};

const KriTable = ({ rows }: { rows: KriImpactRow[] }) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">KRI</th>
            <th className="px-4 py-3">Current</th>
            <th className="px-4 py-3">Projected</th>
            <th className="px-4 py-3">Δ</th>
            <th className="px-4 py-3">Status under scenario</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <KriRow key={r.kri} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

const KriRow = ({ row }: { row: KriImpactRow }) => {
  const delta = row.projected - row.current;
  const deltaColour =
    delta > 0
      ? row.kri === "Training Compliance" || row.kri === "Staff Engagement Score"
        ? "text-emerald-700"
        : "text-red-700"
      : delta < 0
        ? row.kri === "Training Compliance" || row.kri === "Staff Engagement Score"
          ? "text-red-700"
          : "text-emerald-700"
        : "text-slate-600";

  const statusStyles =
    row.status === "Critical"
      ? "bg-red-50 text-red-700 border-red-200"
      : row.status === "Warning"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-blue-50 text-blue-700 border-blue-200";
  const statusDot =
    row.status === "Critical"
      ? "bg-red-600"
      : row.status === "Warning"
        ? "bg-amber-500"
        : "bg-blue-500";

  const sourceChip =
    row.source === "live"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-slate-100 text-slate-600 border-slate-200";
  const sourceLabel = row.source === "live" ? "Live · Public Data" : "Illustrative";

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-900">{row.kri}</span>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${sourceChip}`}
          >
            {sourceLabel}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 font-mono tabular-nums text-slate-900">
        {formatKriValue(row, row.current)}
      </td>
      <td className="px-4 py-3 font-mono tabular-nums text-slate-900">
        {formatKriValue(row, row.projected)}
      </td>
      <td className={`px-4 py-3 font-mono tabular-nums font-semibold ${deltaColour}`}>
        {formatKriDelta(row)}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyles}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} aria-hidden />
          {row.status}
        </span>
      </td>
    </tr>
  );
};
