import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  SCENARIO_IMPACTS,
  type KriImpactRow,
  type ScenarioImpact,
} from "./scenarioImpacts";
import type { Scenario } from "./scenarios";

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
        <EmptyState />
      )}
    </div>
  );
};

const EmptyState = () => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
    <p className="mx-auto max-w-md text-sm italic text-slate-500">
      Load a scenario from the Scenarios tab to visualise its projected impact.
    </p>
  </div>
);

interface DriverContribution {
  kri: string;
  points: number;
}

function computeDrivers(rows: KriImpactRow[], totalDelta: number): DriverContribution[] {
  // Lower-is-better KRIs
  const lowerBetter = new Set([
    "Sickness Absence Rate",
    "Staff Vacancies",
    "Voluntary Turnover",
  ]);

  // Raw signed contribution: sign aligned with whether the KRI improved (+) or deteriorated (-)
  const raw = rows.map((r) => {
    const delta = r.projected - r.current;
    const signed = lowerBetter.has(r.kri) ? -delta : delta;
    return { kri: r.kri, signed };
  });

  const sumSigned = raw.reduce((a, b) => a + b.signed, 0);

  // Scale raw contributions so they sum to the composite delta in points
  let scaled: DriverContribution[];
  if (Math.abs(sumSigned) < 1e-9) {
    scaled = raw.map((r) => ({ kri: r.kri, points: 0 }));
  } else {
    const scale = totalDelta / sumSigned;
    scaled = raw.map((r) => ({ kri: r.kri, points: r.signed * scale }));
  }

  // Round to integers, preserve sum
  const rounded = scaled.map((s) => ({ kri: s.kri, points: Math.round(s.points) }));
  const diff = totalDelta - rounded.reduce((a, b) => a + b.points, 0);
  if (diff !== 0 && rounded.length > 0) {
    // Apply correction to the largest absolute contributor
    let idx = 0;
    rounded.forEach((r, i) => {
      if (Math.abs(r.points) > Math.abs(rounded[idx].points)) idx = i;
    });
    rounded[idx] = { ...rounded[idx], points: rounded[idx].points + diff };
  }

  // Sort by absolute contribution desc
  return rounded.sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
}

function verdictWord(delta: number): string {
  if (delta >= 10) return "sustained improvement";
  if (delta >= 4) return "modest improvement";
  if (delta <= -10) return "sustained decline";
  if (delta <= -4) return "modest decline";
  return "stable";
}

const LoadedView = ({
  scenario,
  onBrowseScenarios,
}: {
  scenario: Scenario;
  onBrowseScenarios: () => void;
}) => {
  const impact: ScenarioImpact | undefined = SCENARIO_IMPACTS[scenario.id];
  const projected = scenario.projectedScore;
  const delta = projected - CURRENT_SCORE;
  const hasLive = impact?.rows.some((r) => r.source === "live") ?? false;

  const drivers = impact ? computeDrivers(impact.rows, delta) : [];
  const maxAbs = drivers.reduce((m, d) => Math.max(m, Math.abs(d.points)), 0);

  const deltaTone =
    delta > 0
      ? { text: "text-emerald-700", arrow: "▲", sign: "+" }
      : delta < 0
        ? { text: "text-red-700", arrow: "▼", sign: "" }
        : { text: "text-slate-600", arrow: "▬", sign: "" };

  return (
    <div className="space-y-5">
      {/* Section 1 — Scenario summary header */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Scenario loaded
            </div>
            <h2 className="mt-1.5 text-[18px] font-medium leading-snug text-slate-900">
              {scenario.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{scenario.description}</p>
            <button
              type="button"
              onClick={onBrowseScenarios}
              className="mt-3 text-sm font-medium text-brand hover:underline"
            >
              Load a different scenario →
            </button>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              {impact?.horizon ?? "Horizon TBC"}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                hasLive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {hasLive ? "Live data" : "Illustrative"}
            </span>
          </div>
        </div>
      </section>

      {/* Section 2 — Projected impact */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="text-base font-medium text-slate-900">Projected impact</h3>

        <div
          className="mt-4 grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
        >
          <MetricBlock
            label="Baseline"
            value={CURRENT_SCORE}
            suffix="/100"
            descriptor="Current Human Capital score"
          />
          <MetricBlock
            label="Projected"
            value={projected}
            suffix="/100"
            descriptor="Post-scenario application"
          />
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Delta</div>
            <div className={`mt-2 text-2xl font-medium tabular-nums ${deltaTone.text}`}>
              <span aria-hidden>{deltaTone.arrow}</span>{" "}
              {deltaTone.sign}
              {delta} pts
            </div>
            <div className="mt-1 text-xs text-slate-500">{verdictWord(delta)}</div>
          </div>
        </div>

        {drivers.length > 0 && (
          <div className="mt-6">
            <div className="text-[13px] text-slate-500">Drivers — contribution per KRI</div>
            <div className="mt-3 space-y-2.5">
              {drivers.map((d) => (
                <DriverRow key={d.kri} driver={d} maxAbs={maxAbs} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Section 3 — How this is calculated */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="text-base font-medium text-slate-900">How this is calculated</h3>
        <div className="mt-4 space-y-5">
          <CalcSubsection label="Inputs">
            {impact?.inputs ??
              "Scenario assumptions are pulled from the scenario configuration and modelled across the Human Capital KRIs."}
          </CalcSubsection>
          <CalcSubsection label="Calculation">
            Each KRI's projected value is recomputed under the scenario assumptions, then reweighted
            to the composite using the Human Capital pillar weights. Baseline is the current
            composite; projected applies the scenario uplifts. Per-KRI bars show each indicator's
            points contribution to the delta.
          </CalcSubsection>
          <CalcSubsection label="Caveats">
            Linear uplift assumed; does not model trust-specific factors, external shocks, or
            interaction effects between interventions. The production engine will apply confidence
            bands and rules-based clamping to the historical KRI range.
          </CalcSubsection>
        </div>
      </section>

      {/* Section 4 — Illustrative footer banner */}
      <div
        role="note"
        aria-label="Illustrative scenario projection disclaimer"
        className="rounded-lg border border-blue-200 border-l-4 border-l-blue-600 bg-blue-50 p-4 sm:p-5"
      >
        <div className="flex items-start gap-3">
          <Info size={20} className="mt-0.5 shrink-0 text-blue-700" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-blue-900">
              Illustrative scenario projection
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-blue-900/90">
              Production build will use the same rules-based engine as the AI Risk Prediction tab,
              with documented inputs, weights, and intervention uplifts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricBlock = ({
  label,
  value,
  suffix,
  descriptor,
}: {
  label: string;
  value: number;
  suffix: string;
  descriptor: string;
}) => (
  <div className="rounded-lg bg-slate-50 p-4">
    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-2 text-2xl font-medium tabular-nums text-slate-900">
      {value}
      <span className="ml-0.5 text-base font-normal text-slate-500">{suffix}</span>
    </div>
    <div className="mt-1 text-xs text-slate-500">{descriptor}</div>
  </div>
);

const DriverRow = ({ driver, maxAbs }: { driver: DriverContribution; maxAbs: number }) => {
  const pct = maxAbs > 0 ? (Math.abs(driver.points) / maxAbs) * 100 : 0;
  const tone =
    driver.points > 0
      ? { fill: "bg-emerald-500", text: "text-emerald-700", sign: "+" }
      : driver.points < 0
        ? { fill: "bg-red-500", text: "text-red-700", sign: "−" }
        : { fill: "bg-slate-300", text: "text-slate-600", sign: "" };

  const absPts = Math.abs(driver.points);
  const valueLabel =
    driver.points === 0 ? "0 pts" : `${tone.sign}${absPts} pt${absPts === 1 ? "" : "s"}`;

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <div className="text-sm text-slate-800 sm:w-[180px] sm:shrink-0">{driver.kri}</div>
      <div className="flex flex-1 items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
          role="presentation"
        >
          <div
            className={`h-full rounded-full ${tone.fill}`}
            style={{ width: `${pct}%` }}
            aria-hidden
          />
        </div>
        <div
          className={`w-[60px] shrink-0 text-right text-sm font-medium tabular-nums ${tone.text}`}
        >
          {valueLabel}
        </div>
      </div>
    </div>
  );
};

const CalcSubsection = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
      {label}
    </div>
    <p className="mt-1.5 text-sm leading-[1.6] text-slate-700">{children}</p>
  </div>
);
