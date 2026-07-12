import { useMemo, useState, useEffect } from "react";
import { Info, ChevronDown, RotateCcw } from "lucide-react";
import {
  Area,
  CartesianGrid,
  Line,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ScoreScale } from "@/components/ScoreScale";
import { useScoreHistory } from "@/hooks/useScoreHistory";
import { useDashboardForecast } from "@/hooks/useDashboardForecast";
import { useHumanCapitalData } from "@/hooks/useHumanCapitalData";
import { classifyTrend, spcChipClasses } from "@/lib/spc";
import { bandFor } from "@/lib/scoringEngine";
import { useAIInterventions, type DataPointInfo, type TieredIntervention } from "@/hooks/useAIInterventions";
import { PILLAR_CONFIG, resolveDataPoints } from "@/config/dataPoints";
import { pillarScoreWithOverride, pillarScoreWithOverrideRaw, pillarIndicatorScoresWithOverrides } from "@/lib/pillarScores";

// Format a value + unit for the simulation copy.
// %: tight (e.g. "3%"); score: phrased ("a score of 6.9"); else spaced ("45 days").
function formatValueUnit(value: number, unit: string): string {
  if (unit === "%") return `${value}%`;
  if (unit === "score") return `a score of ${value}`;
  return `${value} ${unit}`;
}
function assumptionPhrase(name: string, value: number, unit: string): string {
  return `${name.toLowerCase()} reaches ${formatValueUnit(value, unit)}`;
}

const FORECAST_COLOR = "#6366F1";
const ACTUAL_COLOR = "#F59E0B";
const SIMULATION_COLOR = "#16A34A";

const TIER_META: Record<1 | 2 | 3, { label: string; badgeClass: string }> = {
  1: { label: "Level 1 — No regret", badgeClass: "bg-green-100 text-green-800 border-green-300" },
  2: { label: "Level 2 — Committed effort", badgeClass: "bg-amber-100 text-amber-800 border-amber-300" },
  3: { label: "Level 3 — Last resort", badgeClass: "bg-red-100 text-red-800 border-red-300" },
};

function displayDirection(d: string): string {
  return d === "Worsening" ? "Declining" : d;
}

function formatPeriod(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

export const AiRiskPredictionTab = () => {
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [openRationaleId, setOpenRationaleId] = useState<string | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  // Clear any active simulation on unmount (leaving the tab).
  useEffect(() => {
    return () => setSimulatingId(null);
  }, []);

  const { points, loading } = useScoreHistory("dashboard", "dashboard");
  const forecast = useDashboardForecast();

  const scores = useMemo(
    () => points.map((p) => Math.round(p.normalised_score)),
    [points],
  );
  const currentScore =
    forecast.currentScore ?? (scores.length > 0 ? scores[scores.length - 1] : null);
  const spc = useMemo(() => classifyTrend(scores), [scores]);

  const recentActuals = useMemo(() => {
    const rows = points.slice(-6).map((p) => ({
      period: formatPeriod(p.snapshot_date),
      actual: Math.round(p.normalised_score),
    }));
    if (rows.length > 0 && currentScore != null) {
      rows[rows.length - 1] = { ...rows[rows.length - 1], actual: currentScore };
    }
    return rows;
  }, [points, currentScore]);

  const projectedScore =
    forecast.points.length > 0
      ? forecast.points[forecast.points.length - 1].value
      : null;
  const forecastLow =
    forecast.points.length > 0
      ? Math.min(...forecast.points.map((p) => p.lower))
      : null;
  const forecastHigh =
    forecast.points.length > 0
      ? Math.max(...forecast.points.map((p) => p.upper))
      : null;

  const ragBandName = currentScore != null ? bandFor(currentScore).name : null;

  const { data: hcData } = useHumanCapitalData();

  // Live-values map for the Human pillar: latest live KRI values keyed by liveKriId.
  const liveValues = useMemo<Record<string, number | null>>(() => {
    const map: Record<string, number | null> = {};
    Object.entries(hcData.capturesByKri).forEach(([kriId, caps]) => {
      const latest = caps[0];
      map[kriId] = latest?.headline_value != null ? Number(latest.headline_value) : null;
    });
    return map;
  }, [hcData]);

  // Resolve every Human data point (live + illustrative) with its current value —
  // this is what the AI classifies against and simulates over.
  const humanDataPoints = useMemo<DataPointInfo[]>(() => {
    const human = PILLAR_CONFIG.find((p) => p.id === "human");
    if (!human) return [];
    const list: DataPointInfo[] = [];
    for (const ind of human.indicators) {
      for (const dp of resolveDataPoints(ind, liveValues)) {
        if (dp.value == null) continue;
        list.push({
          id: dp.id,
          name: dp.name,
          currentValue: Number(dp.value),
          target: dp.target,
          minimumThreshold: dp.minimumThreshold,
          unit: dp.unit,
          direction: dp.direction,
        });
      }
    }
    return list;
  }, [liveValues]);

  const {
    interventions,
    loading: interventionsLoading,
    error: interventionsError,
  } = useAIInterventions({
    score: currentScore,
    ragBand: ragBandName,
    dataPoints: humanDataPoints,
  });

  // Baseline pillar score (all live+illustrative data at today's values).
  const baselinePillar = useMemo(
    () => pillarScoreWithOverride(liveValues, "human", {}),
    [liveValues],
  );

  // Per-intervention: engine-computed uplift at today's values, and per-indicator
  // baseline/after scores (used for the "affected indicators" chips + card copy).
  const withSimulated = useMemo(() => {
    const baselineIndicators = pillarIndicatorScoresWithOverrides(liveValues, "human", {});
    const baselineById = new Map(baselineIndicators.map((i) => [i.id, i]));

    return interventions.map((i) => {
      const overrides: Record<string, number> = {};
      for (const t of i.targets) overrides[t.dataPointId] = t.assumedValue;

      const overriddenPillar = pillarScoreWithOverride(liveValues, "human", overrides);
      const uplift =
        overriddenPillar != null && baselinePillar != null
          ? Math.max(0, overriddenPillar - baselinePillar)
          : 0;

      const overriddenIndicators = pillarIndicatorScoresWithOverrides(liveValues, "human", overrides);
      const affectedIndicators = overriddenIndicators
        .map((ind) => {
          const base = baselineById.get(ind.id);
          if (!base || base.score == null || ind.score == null) return null;
          if (base.score === ind.score) return null;
          return { id: ind.id, name: ind.name, before: base.score, after: ind.score };
        })
        .filter((x): x is { id: string; name: string; before: number; after: number } => x !== null);

      return { intervention: i, uplift, affectedIndicators };
    });
  }, [interventions, liveValues, baselinePillar]);

  // Sort: tier ascending, then uplift descending.
  const orderedInterventions = useMemo(() => {
    return [...withSimulated].sort((a, b) => {
      if (a.intervention.tier !== b.intervention.tier) return a.intervention.tier - b.intervention.tier;
      return b.uplift - a.uplift;
    });
  }, [withSimulated]);

  const activeSim = orderedInterventions.find((x) => x.intervention.id === simulatingId) ?? null;
  const activeRank = activeSim
    ? orderedInterventions.findIndex((x) => x.intervention.id === simulatingId) + 1
    : null;

  // Simulated end score in the outlook = projected + uplift, capped at 100.
  const simulatedEndScore =
    activeSim && projectedScore != null
      ? Math.min(100, projectedScore + activeSim.uplift)
      : null;

  const dpById = useMemo(
    () => new Map(humanDataPoints.map((d) => [d.id, d])),
    [humanDataPoints],
  );

  const zoomedChartData = useMemo(() => {
    if (forecast.method === "none" || forecast.points.length === 0 || recentActuals.length === 0) {
      return [] as Array<{
        period: string;
        actual?: number;
        forecast?: number;
        simulated?: number;
        band?: [number, number];
      }>;
    }
    const rows: Array<{
      period: string;
      actual?: number;
      forecast?: number;
      simulated?: number;
      band?: [number, number];
    }> = recentActuals.map((a) => ({ period: a.period, actual: a.actual }));
    const last = recentActuals[recentActuals.length - 1];
    rows[rows.length - 1] = {
      ...rows[rows.length - 1],
      forecast: last.actual,
      band: [last.actual, last.actual],
      // At t=0 the simulated line matches today's actual — uplift ramps in.
      simulated: activeSim ? last.actual : undefined,
    };
    const forecastPts = forecast.points;
    const uplift = activeSim?.uplift ?? 0;
    for (let idx = 0; idx < forecastPts.length; idx += 1) {
      const p = forecastPts[idx];
      const t = (idx + 1) / forecastPts.length;
      const simulated = activeSim
        ? Math.min(100, Math.round(p.value + uplift * t))
        : undefined;
      rows.push({
        period: formatPeriod(p.date),
        forecast: p.value,
        band: [p.lower, p.upper],
        simulated,
      });
    }
    return rows;
  }, [forecast, recentActuals, activeSim]);

  // Data-driven y-axis domain: span every plotted numeric value.
  const yDomain = useMemo<[number, number]>(() => {
    const values: number[] = [];
    for (const r of zoomedChartData) {
      if (r.actual != null) values.push(r.actual);
      if (r.forecast != null) values.push(r.forecast);
      if (r.simulated != null) values.push(r.simulated);
      if (r.band) values.push(r.band[0], r.band[1]);
    }
    if (values.length === 0) return [0, 100];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const lower = Math.max(0, Math.floor((min - 8) / 5) * 5);
    const upper = Math.min(100, Math.ceil((max + 8) / 5) * 5);
    return [lower, upper];
  }, [zoomedChartData]);
  const yTicks = useMemo(() => {
    const [lo, hi] = yDomain;
    const step = hi - lo <= 30 ? 5 : 10;
    const ticks: number[] = [];
    for (let v = lo; v <= hi; v += step) ticks.push(v);
    return ticks;
  }, [yDomain]);

  const todayLabel = recentActuals[recentActuals.length - 1]?.period;
  const forecastAvailable = zoomedChartData.length > 0;

  const activeAssumptions = activeSim
    ? activeSim.intervention.targets
        .map((t) => {
          const dp = dpById.get(t.dataPointId);
          if (!dp) return null;
          return assumptionPhrase(dp.name, t.assumedValue, dp.unit);
        })
        .filter((s): s is string => Boolean(s))
    : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">AI Risk Prediction</h1>
        <p className="mt-1 text-sm text-slate-600">
          Forward outlook based on the current trend in Human Capital indicators.
        </p>
      </div>

      <section
        aria-label="How trend direction is assessed"
        className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5"
      >
        <div className="flex items-start gap-3">
          <Info size={20} className="mt-0.5 shrink-0 text-slate-500" aria-hidden />
          <div className="min-w-0 space-y-2 text-base leading-relaxed text-slate-700">
            <h2 className="text-base font-semibold text-slate-900">
              How trend direction is assessed
            </h2>
            <p>
              Trend is classified using NHS Making Data Count (XmR) rules over the
              Human Capital score history. Short-term fluctuations within control
              limits are treated as common-cause variation, not as a signal.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Left — chart */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Human Capital score trajectory
              </h2>
              <span className="text-xs text-slate-500">0–100 scale · axis zoomed to data</span>
            </div>

            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Next 3 months outlook
                </span>
                <span
                  title={spc.tooltip}
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${spcChipClasses(spc.direction)}`}
                >
                  {displayDirection(spc.direction)}
                </span>
              </div>
              {loading || forecast.loading ? (
                <div className="text-xs text-slate-500">Loading outlook…</div>
              ) : currentScore != null && projectedScore != null ? (
                <>
                  <div className="flex flex-wrap items-baseline gap-3">
                    <div className="flex flex-col">
                      <span className="text-[11px] uppercase tracking-wide text-slate-500">Current</span>
                      <span className="text-3xl font-semibold text-slate-900 tabular-nums">{currentScore}</span>
                    </div>
                    <span className="text-2xl text-slate-400" aria-hidden>→</span>
                    <div className="flex flex-col">
                      <span className="text-[11px] uppercase tracking-wide text-slate-500">Projected</span>
                      <span className="text-3xl font-semibold tabular-nums" style={{ color: FORECAST_COLOR }}>
                        {projectedScore}
                      </span>
                    </div>
                    {activeSim && simulatedEndScore != null && (
                      <>
                        <span className="text-2xl text-slate-400" aria-hidden>→</span>
                        <div className="flex flex-col">
                          <span className="text-[11px] uppercase tracking-wide text-slate-500">
                            Simulated · Intervention {activeRank}
                          </span>
                          <span className="text-3xl font-semibold tabular-nums" style={{ color: SIMULATION_COLOR }}>
                            {simulatedEndScore}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  {activeSim && (
                    <div className="mt-2 space-y-2">
                      <span className="inline-flex items-center rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-800">
                        Simulation — illustrative
                      </span>
                      {activeSim.affectedIndicators.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {activeSim.affectedIndicators.map((ind) => (
                            <span
                              key={ind.id}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700"
                            >
                              {ind.name}{" "}
                              <span className="tabular-nums text-slate-500">{ind.before}</span>
                              <span className="text-slate-400" aria-hidden>→</span>
                              <span className="tabular-nums font-semibold" style={{ color: SIMULATION_COLOR }}>{ind.after}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {forecastLow != null && forecastHigh != null && ragBandName && (
                    <p className="mt-2 text-xs text-slate-600">
                      Expected range {forecastLow}–{forecastHigh} ·{" "}
                      {ragBandName === "Green"
                        ? "at or above target"
                        : ragBandName === "Amber"
                          ? "within operating range, below target"
                          : "below the minimum threshold"}
                    </p>
                  )}
                </>
              ) : currentScore != null ? (
                <ScoreScale score={currentScore} size="compact" label="Current score" />
              ) : (
                <div className="text-xs text-slate-500">Current score unavailable.</div>
              )}
            </div>

            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Last 6 months and next 3 months
              </h3>
              <span className="text-[11px] text-slate-500">
                Solid amber = actual · Dashed indigo = forecast{activeSim ? " · Dashed green = simulated" : ""}
              </span>
            </div>

            {activeSim && (
              <div className="mb-2 flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs">
                <span className="text-green-900">
                  Simulating Intervention {activeRank}: <span className="font-medium">{activeSim.intervention.title}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSimulatingId(null)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw size={12} aria-hidden /> Reset to current forecast
                </button>
              </div>
            )}

            {forecast.loading ? (
              <div className="flex h-56 items-center justify-center text-xs text-slate-400">
                Loading forecast…
              </div>
            ) : !forecastAvailable ? (
              <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-500">
                Forecast unavailable — insufficient historical data.
              </div>
            ) : (
              <div className="h-56 w-full sm:h-64" role="img" aria-label="Last 6 months of actuals plus the next 3 months projected.">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={zoomedChartData}
                    margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 4" vertical={false} />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 11, fill: "#475569" }}
                      tickLine={false}
                      axisLine={{ stroke: "#cbd5e1" }}
                      interval={0}
                      height={32}
                    />
                    <YAxis
                      domain={yDomain}
                      ticks={yTicks}
                      tick={{ fontSize: 11, fill: "#475569" }}
                      tickLine={false}
                      axisLine={{ stroke: "#cbd5e1" }}
                      width={36}
                    />
                    {todayLabel && (
                      <ReferenceLine
                        x={todayLabel}
                        stroke="#64748B"
                        strokeDasharray="4 3"
                        label={{ value: "today", fontSize: 10, fill: "#475569", position: "top" }}
                      />
                    )}
                    <RTooltip
                      formatter={(v: number | [number, number], name: string) => {
                        if (name === "band" && Array.isArray(v)) return [`${v[0]} – ${v[1]}`, "Projected range"];
                        if (name === "forecast") return [`${v}`, "Projection"];
                        if (name === "simulated") return [`${v}`, "Simulated"];
                        return [`${v}`, "Actual"];
                      }}
                      labelFormatter={(l: string) => l}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="band"
                      stroke="none"
                      fill={FORECAST_COLOR}
                      fillOpacity={0.15}
                      isAnimationActive={false}
                      activeDot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke={ACTUAL_COLOR}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#ffffff", stroke: ACTUAL_COLOR, strokeWidth: 2 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke={FORECAST_COLOR}
                      strokeWidth={2.5}
                      strokeDasharray="6 4"
                      dot={{ r: 3, fill: "#ffffff", stroke: FORECAST_COLOR, strokeWidth: 2 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                      connectNulls
                    />
                    {activeSim && (
                      <Line
                        type="monotone"
                        dataKey="simulated"
                        stroke={SIMULATION_COLOR}
                        strokeWidth={2.5}
                        strokeDasharray="2 4"
                        dot={{ r: 3, fill: "#ffffff", stroke: SIMULATION_COLOR, strokeWidth: 2 }}
                        activeDot={{ r: 5 }}
                        isAnimationActive={false}
                        connectNulls
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeSim && activeAssumptions.length > 0 && (
              <p className="mt-2 text-[11px] italic text-slate-600">
                Simulation assumes {activeAssumptions.join(", ")} within 3 months; scores recomputed with the standard scoring method.
              </p>
            )}

            {forecastAvailable && forecast.caption && (
              <p className="mt-3 text-[11px] italic text-slate-500">
                {forecast.caption} Other indicators held flat across the horizon;
                shown as a projection, not a prediction.
              </p>
            )}
            <p className="mt-2 text-[11px] text-slate-500">
              The Score over time chart shows history only; the forecast is shown here.
            </p>
          </div>
        </div>

        {/* Right — interventions */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="text-base font-semibold text-slate-900">Priority interventions</h3>
            <p className="mt-1 text-xs italic text-slate-500">
              AI-generated recommendations · Based on current score and RAG band · Not a substitute for professional judgement
            </p>

            {interventionsLoading ? (
              <ul className="mt-4 space-y-3" aria-label="Loading recommendations">
                {[0, 1, 2, 3].map((i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200" />
                      <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : interventionsError || orderedInterventions.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">
                Recommendations unavailable — please try refreshing the page.
              </p>
            ) : (
              <>
                <ol className="mt-4 space-y-3">
                  {orderedInterventions.map(({ intervention, uplift, affectedIndicators }, idx) => {
                    const cardSimEnd =
                      projectedScore != null ? Math.min(100, projectedScore + uplift) : null;
                    const movesLine =
                      affectedIndicators.length > 0
                        ? `Moves: ${affectedIndicators.map((a) => a.name).join(", ")}`
                        : "";
                    const isActive = simulatingId === intervention.id;
                    const isOpen = openRationaleId === intervention.id;
                    const meta = TIER_META[intervention.tier];
                    return (
                      <li
                        key={intervention.id}
                        className={`rounded-lg border p-4 ${isActive ? "border-green-400 bg-green-50/40 ring-1 ring-green-300" : "border-slate-200 bg-white"}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">{intervention.title}</span>
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.badgeClass}`}>
                                {meta.label}
                              </span>
                            </div>
                            <p className="mt-1 text-sm leading-relaxed text-slate-700">
                              {intervention.description}
                            </p>
                            <div className="mt-1 text-[11px] text-slate-500">
                              Time to impact: {intervention.timeToImpact}
                            </div>

                            <button
                              type="button"
                              onClick={() => setOpenRationaleId(isOpen ? null : intervention.id)}
                              aria-expanded={isOpen}
                              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900"
                            >
                              Why this level
                              <ChevronDown size={12} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                            </button>
                            {isOpen && (
                              <p className="mt-1 rounded-md bg-slate-50 p-2 text-xs leading-relaxed text-slate-700">
                                {intervention.tierRationale}
                              </p>
                            )}

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] text-slate-500">
                                  {cardSimEnd != null
                                    ? `Simulated end score: ${cardSimEnd}${uplift > 0 ? ` (+${uplift})` : ""}`
                                    : ""}
                                </span>
                                {movesLine && (
                                  <span className="text-[11px] text-slate-500">{movesLine}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setSimulatingId(isActive ? null : intervention.id)}
                                className={`rounded-md border px-3 py-1.5 text-xs font-medium ${isActive ? "border-green-500 bg-green-600 text-white hover:bg-green-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                              >
                                {isActive ? "Simulating…" : "Simulate this intervention"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-3 text-[11px] italic text-slate-500">
                  Indicative effects only. Actual impact depends on scope, funding and execution — refine with client-specific data.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setExplainerOpen((v) => !v)}
          aria-expanded={explainerOpen}
          className="flex w-full items-center justify-between px-4 py-4 text-left sm:px-6"
        >
          <span className="text-sm font-semibold text-slate-900">Why this prediction?</span>
          <ChevronDown
            size={16}
            className={`text-slate-500 transition-transform ${explainerOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {explainerOpen && (
          <div className="border-t border-slate-200 px-4 py-5 text-base leading-relaxed text-slate-700 sm:px-6">
            The projection extrapolates the current trend in the Human Capital
            score forward and assumes no new interventions are taken. The shaded
            band reflects modelled uncertainty. Simulated interventions apply the
            AI's assumed indicator value through the same normalisation engine
            used everywhere else on the dashboard — no separate calculation.
          </div>
        )}
      </div>
    </div>
  );
};
