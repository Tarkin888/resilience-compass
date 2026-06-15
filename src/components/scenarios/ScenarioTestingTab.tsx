// Tab 2 — Scenario Testing.
// Users adjust live KRI raw values; on Run Scenario we recompute pillar +
// dashboard scores using the existing scoring engine. Live overlay only —
// nothing is written to the database.
import { useMemo, useState, useEffect } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useHumanCapitalData } from "@/hooks/useHumanCapitalData";
import { useScenario } from "@/contexts/ScenarioContext";
import { PILLAR_CONFIG } from "@/config/dataPoints";
import { computePillarScores } from "@/lib/pillarScores";
import { scoreBand, scoreBandColor } from "@/lib/scoreBand";
import { SCENARIOS, SCENARIO_SEVERITY_STYLES } from "./scenarios";

interface KriRow {
  kriId: string;
  name: string;
  unit: string;
  currentValue: number | null;
  target: number;
  minimumThreshold: number;
  direction: "higherIsBetter" | "lowerIsBetter";
}

function fmt(value: number | null, unit: string) {
  if (value == null) return "—";
  const v = unit === "%" ? value.toFixed(1) : String(value);
  return unit === "%" ? `${v}%` : `${v} ${unit}`;
}

function RagBadge({ score }: { score: number | null }) {
  const band = scoreBand(score);
  const color = scoreBandColor(score);
  const label = band === "unscored" ? "—" : band[0].toUpperCase() + band.slice(1);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {score ?? "—"} · {label}
    </span>
  );
}

function DeltaChip({ delta }: { delta: number | null }) {
  if (delta == null || delta === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
        — 0
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
        positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      {positive ? "▲" : "▼"} {Math.abs(delta)}
    </span>
  );
}

export const ScenarioTestingTab = ({ onViewImpact }: { onViewImpact: () => void }) => {
  const { data } = useHumanCapitalData();
  const {
    overrides, setOverride, resetOverrides, runScenario, hasRun,
    selectedScenario, setSelectedScenario, markScenarioModified,
  } = useScenario();
  const selectedScenarioId = selectedScenario?.id ?? null;

  // Live values keyed by kri_id (same shape pillarScores expects).
  const liveValues = useMemo<Record<string, number | null>>(() => {
    const out: Record<string, number | null> = {};
    Object.entries(data.capturesByKri).forEach(([kriId, caps]) => {
      const latest = caps[0];
      out[kriId] = latest ? Number(latest.headline_value) : null;
    });
    return out;
  }, [data]);

  // The live KRIs on /human (Tab 1) — driven by config, not hard-coded.
  const humanPillar = PILLAR_CONFIG.find((p) => p.id === "human")!;
  const liveRows = useMemo<KriRow[]>(() => {
    const rows: KriRow[] = [];
    humanPillar.indicators.forEach((ind) => {
      ind.dataPoints.forEach((dp) => {
        if (!dp.liveKriId) return; // strictly live KRIs per spec
        rows.push({
          kriId: dp.liveKriId,
          name: dp.name,
          unit: dp.unit,
          currentValue: liveValues[dp.liveKriId] ?? null,
          target: dp.target,
          minimumThreshold: dp.minimumThreshold,
          direction: dp.direction,
        });
      });
    });
    return rows;
  }, [humanPillar, liveValues]);

  // Local string state mirrors numeric overrides for clean input UX.
  const [inputs, setInputs] = useState<Record<string, string>>({});
  useEffect(() => {
    // Pre-fill on first load / when live values change for KRIs not yet edited.
    setInputs((prev) => {
      const next = { ...prev };
      liveRows.forEach((r) => {
        if (next[r.kriId] == null && r.currentValue != null) next[r.kriId] = String(r.currentValue);
      });
      return next;
    });
  }, [liveRows]);

  const handleChange = (kriId: string, raw: string) => {
    setInputs((p) => ({ ...p, [kriId]: raw }));
    setSelectedScenarioId(null);
    const parsed = raw.trim() === "" ? null : Number(raw);
    const row = liveRows.find((r) => r.kriId === kriId);
    if (parsed != null && row && Number.isFinite(parsed) && parsed !== row.currentValue) {
      setOverride(kriId, parsed);
    } else {
      setOverride(kriId, null);
    }
  };

  const handleReset = () => {
    resetOverrides();
    setSelectedScenarioId(null);
    const next: Record<string, string> = {};
    liveRows.forEach((r) => {
      if (r.currentValue != null) next[r.kriId] = String(r.currentValue);
    });
    setInputs(next);
  };

  const handleSelectScenario = (scenarioId: string) => {
    const scenario = SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) return;
    setSelectedScenarioId(scenarioId);
    // Start from live values, then apply overrides for any kris in the preset.
    const nextInputs: Record<string, string> = {};
    liveRows.forEach((r) => {
      const presetVal = scenario.inputs[r.kriId];
      if (presetVal != null) {
        nextInputs[r.kriId] = String(presetVal);
        setOverride(r.kriId, presetVal);
      } else {
        if (r.currentValue != null) nextInputs[r.kriId] = String(r.currentValue);
        setOverride(r.kriId, null);
      }
    });
    setInputs((prev) => ({ ...prev, ...nextInputs }));
    // Defer runScenario so override state has flushed.
    setTimeout(() => runScenario(), 0);
  };

  const hasChanges = Object.keys(overrides).length > 0;

  // Pre-compute live pillar scores.
  const livePillars = useMemo(() => computePillarScores(liveValues), [liveValues]);
  const scenarioValues = useMemo(() => ({ ...liveValues, ...overrides }), [liveValues, overrides]);
  const scenarioPillars = useMemo(
    () => computePillarScores(scenarioValues),
    [scenarioValues],
  );

  const livePillarMap = useMemo(
    () => Object.fromEntries(livePillars.map((p) => [p.id, p])),
    [livePillars],
  );
  const scenarioPillarMap = useMemo(
    () => Object.fromEntries(scenarioPillars.map((p) => [p.id, p])),
    [scenarioPillars],
  );

  const dashboardBefore = useMemo(() => {
    const scored = livePillars.filter((p) => p.score != null) as Array<{ score: number }>;
    return scored.length ? Math.round(scored.reduce((a, p) => a + p.score, 0) / scored.length) : null;
  }, [livePillars]);
  const dashboardAfter = useMemo(() => {
    const scored = scenarioPillars.filter((p) => p.score != null) as Array<{ score: number }>;
    return scored.length ? Math.round(scored.reduce((a, p) => a + p.score, 0) / scored.length) : null;
  }, [scenarioPillars]);

  // Per-KRI before/after scores using the pillar rollup's underlying indicator
  // scores (each live KRI is the sole data point of its indicator).
  const indicatorScoreFor = (kriId: string, pillarMap: Record<string, { indicators: Array<{ id: string; score: number | null }> }>) => {
    // map liveKriId → indicator id by walking the human pillar config
    const ind = humanPillar.indicators.find((i) => i.dataPoints.some((d) => d.liveKriId === kriId));
    if (!ind) return null;
    return pillarMap["human"]?.indicators.find((i) => i.id === ind.id)?.score ?? null;
  };

  const humanBefore = livePillarMap["human"]?.score ?? null;
  const humanAfter = scenarioPillarMap["human"]?.score ?? null;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          Illustrative scenario modelling
        </p>
        <p className="mt-1 text-sm text-amber-900">
          Selecting a scenario loads example values into the live calculator. Only Staff Vacancy
          Rate and Sickness Absence move on real NHS data; all other indicators are held at current
          levels pending historical data. Results are a hypothetical what-if — not a forecast —
          and do not affect live data.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#001D57]">Preset scenarios</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Click a scenario to load its example values into the calculator below.
          </p>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
          {SCENARIOS.map((s) => {
            const sev = SCENARIO_SEVERITY_STYLES[s.severity];
            const selected = selectedScenarioId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectScenario(s.id)}
                className={`flex flex-col gap-2 rounded-lg border p-3 text-left transition hover:border-[#001D57] hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  selected
                    ? "border-[#001D57] bg-[#001D57]/5 ring-2 ring-[#001D57]/30"
                    : "border-slate-200 bg-white"
                }`}
                aria-pressed={selected}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${sev.chip}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} aria-hidden />
                    {s.severity}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    {s.type}
                  </span>
                </div>
                <div className="text-sm font-semibold text-[#001D57]">{s.title}</div>
                <p className="text-xs text-slate-600">{s.description}</p>
              </button>
            );
          })}
        </div>
      </div>


      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#001D57]">Scenario inputs</h2>
        </div>
        <div className="divide-y divide-slate-200">
          {liveRows.map((r) => {
            const targetLabel = `Target: ${r.direction === "lowerIsBetter" ? "< " : "≥ "}${fmt(r.target, r.unit)}`;
            const minLabel = `Min threshold: ${r.direction === "lowerIsBetter" ? "< " : "≥ "}${fmt(r.minimumThreshold, r.unit)}`;
            return (
              <div key={r.kriId} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4 sm:px-5">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{r.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Current: {fmt(r.currentValue, r.unit)} · {targetLabel} · {minLabel}
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <span className="sr-only">Hypothetical {r.name}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={inputs[r.kriId] ?? ""}
                    onChange={(e) => handleChange(r.kriId, e.target.value)}
                    className="w-28 rounded-md border border-slate-300 bg-white px-2 py-2 text-right text-sm tabular-nums focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  <span className="text-xs font-medium text-slate-500">{r.unit}</span>
                </label>
                <span className="text-xs text-slate-400 sm:text-right">
                  {overrides[r.kriId] != null ? "Changed" : "Unchanged"}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col-reverse items-stretch gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-5">
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasChanges}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RotateCcw size={14} aria-hidden />
            Reset
          </button>
          <button
            type="button"
            onClick={runScenario}
            disabled={!hasChanges}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#001D57] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002577] disabled:opacity-50"
          >
            Run scenario
          </button>
        </div>
      </div>

      {hasRun && hasChanges && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#001D57]">Scenario result</h2>
            <p className="mt-0.5 text-xs text-amber-700">Illustrative only — does not affect live data</p>
          </div>
          <div className="divide-y divide-slate-200">
            {Object.keys(overrides).map((kriId) => {
              const before = indicatorScoreFor(kriId, livePillarMap);
              const after = indicatorScoreFor(kriId, scenarioPillarMap);
              const delta = before != null && after != null ? after - before : null;
              const row = liveRows.find((r) => r.kriId === kriId);
              return (
                <div key={kriId} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                  <span className="min-w-0 flex-1 text-sm font-medium text-slate-900">{row?.name ?? kriId}</span>
                  <RagBadge score={before} />
                  <ArrowRight size={14} className="text-slate-400" aria-hidden />
                  <RagBadge score={after} />
                  <DeltaChip delta={delta} />
                </div>
              );
            })}
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 px-4 py-3 sm:px-5">
              <span className="min-w-0 flex-1 text-sm font-semibold text-[#001D57]">Human Capital pillar</span>
              <RagBadge score={humanBefore} />
              <ArrowRight size={14} className="text-slate-400" aria-hidden />
              <RagBadge score={humanAfter} />
              <DeltaChip delta={humanBefore != null && humanAfter != null ? humanAfter - humanBefore : null} />
            </div>
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
              <span className="min-w-0 flex-1 text-sm font-semibold text-[#001D57]">Dashboard (Five Capitals)</span>
              <RagBadge score={dashboardBefore} />
              <ArrowRight size={14} className="text-slate-400" aria-hidden />
              <RagBadge score={dashboardAfter} />
              <DeltaChip delta={dashboardBefore != null && dashboardAfter != null ? dashboardAfter - dashboardBefore : null} />
            </div>
          </div>
          <div className="flex justify-end border-t border-slate-200 px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={onViewImpact}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#001D57] hover:bg-slate-50"
            >
              View pillar impact
              <ArrowRight size={14} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
