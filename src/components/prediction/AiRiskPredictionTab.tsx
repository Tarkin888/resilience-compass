import { useMemo, useState } from "react";
import { Info, ChevronDown } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ComposedChart,
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
import { useAIInterventions, type KRI } from "@/hooks/useAIInterventions";

const FORECAST_COLOR = "#6366F1"; // matches TrendPanel
const ACTUAL_COLOR = "#F59E0B"; // amber, matches Score over time chart

function displayDirection(d: string): string {
  return d === "Worsening" ? "Declining" : d;
}

function formatPeriod(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

export const AiRiskPredictionTab = () => {
  const [explainerOpen, setExplainerOpen] = useState(false);

  const { points, loading } = useScoreHistory("dashboard", "dashboard");
  const forecast = useDashboardForecast();

  const scores = useMemo(
    () => points.map((p) => Math.round(p.normalised_score)),
    [points],
  );
  const currentScore = scores.length > 0 ? scores[scores.length - 1] : null;
  const spc = useMemo(() => classifyTrend(scores), [scores]);

  const recentActuals = useMemo(
    () =>
      points.slice(-6).map((p) => ({
        period: formatPeriod(p.snapshot_date),
        actual: Math.round(p.normalised_score),
      })),
    [points],
  );

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

  const zoomedChartData = useMemo(() => {
    if (forecast.method === "none" || forecast.points.length === 0 || recentActuals.length === 0) {
      return [] as Array<{
        period: string;
        actual?: number;
        forecast?: number;
        band?: [number, number];
      }>;
    }
    const rows: Array<{
      period: string;
      actual?: number;
      forecast?: number;
      band?: [number, number];
    }> = recentActuals.map((a) => ({ period: a.period, actual: a.actual }));
    // Join row: last actual seeds the forecast line so they connect cleanly.
    const last = recentActuals[recentActuals.length - 1];
    rows[rows.length - 1] = {
      ...rows[rows.length - 1],
      forecast: last.actual,
      band: [last.actual, last.actual],
    };
    for (const p of forecast.points) {
      rows.push({
        period: formatPeriod(p.date),
        forecast: p.value,
        band: [p.lower, p.upper],
      });
    }
    return rows;
  }, [forecast, recentActuals]);

  const todayLabel = recentActuals[recentActuals.length - 1]?.period;
  const forecastAvailable = zoomedChartData.length > 0;

  const ragBandName = currentScore != null ? bandFor(currentScore).name : null;

  // Live KRI values for the Human Capital pillar (latest capture per KRI).
  const { data: hcData } = useHumanCapitalData();
  const liveKris = useMemo<KRI[]>(() => {
    const result: KRI[] = [];
    const map: Array<{ kriId: string; name: string }> = [
      { kriId: "sickness_absence", name: "Sickness Absence Rate" },
      { kriId: "vacancy", name: "Staff Vacancies" },
    ];
    for (const { kriId, name } of map) {
      const latest = hcData.capturesByKri[kriId]?.[0];
      const threshold = hcData.thresholdsByKri[kriId];
      if (
        latest?.headline_value != null &&
        threshold?.threshold_value != null
      ) {
        result.push({
          name,
          value: Number(latest.headline_value),
          target: Number(threshold.threshold_value),
          unit: latest.headline_unit ?? "%",
        });
      }
    }
    return result;
  }, [hcData]);

  const {
    interventions,
    loading: interventionsLoading,
    error: interventionsError,
  } = useAIInterventions({
    score: currentScore,
    ragBand: ragBandName,
    kris: liveKris,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">AI Risk Prediction</h1>
        <p className="mt-1 text-sm text-slate-600">
          Forward outlook based on the current trend in Human Capital indicators.
        </p>
      </div>

      {/* Trend definition — strategic framing */}
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

      {/* Two-column main area */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Left — chart (≈60%) */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Human Capital score trajectory
              </h2>
              <span className="text-xs text-slate-500">0–100 scale</span>
            </div>

            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Current trend
                </span>
                <span
                  title={spc.tooltip}
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${spcChipClasses(spc.direction)}`}
                >
                  {spc.direction}
                </span>
              </div>
              {loading ? (
                <div className="text-xs text-slate-500">Loading current score…</div>
              ) : currentScore != null ? (
                <ScoreScale score={currentScore} size="compact" label="Current score" />
              ) : (
                <div className="text-xs text-slate-500">
                  Current score unavailable.
                </div>
              )}
            </div>

            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Projected score — next {forecastChartData.length || 3} months
              </h3>
              <span className="text-[11px] text-slate-500">
                Dashed line + shaded band = forecast
              </span>
            </div>

            {forecast.loading ? (
              <div className="flex h-56 items-center justify-center text-xs text-slate-400">
                Loading forecast…
              </div>
            ) : !forecastAvailable ? (
              <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-500">
                Forecast unavailable — insufficient historical data.
              </div>
            ) : (
              <div className="h-56 w-full sm:h-64" role="img" aria-label="Projected Human Capital score over the forecast horizon.">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={forecastChartData}
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
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      tick={{ fontSize: 11, fill: "#475569" }}
                      tickLine={false}
                      axisLine={{ stroke: "#cbd5e1" }}
                      width={36}
                    />
                    <RTooltip
                      formatter={(v: number | [number, number], name: string) => {
                        if (name === "band" && Array.isArray(v)) {
                          return [`${v[0]} – ${v[1]}`, "Projected range"];
                        }
                        return [`${v}`, "Projection"];
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
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke={FORECAST_COLOR}
                      strokeWidth={2.5}
                      strokeDasharray="6 4"
                      dot={{ r: 4, fill: "#ffffff", stroke: FORECAST_COLOR, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {forecastAvailable && forecast.caption && (
              <p className="mt-3 text-[11px] italic text-slate-500">
                {forecast.caption} Other indicators held flat across the horizon;
                shown as a projection, not a prediction.
              </p>
            )}
          </div>
        </div>

        {/* Right — interventions (≈40%) */}
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
            ) : interventionsError ? (
              <p className="mt-4 text-sm text-slate-600">
                Recommendations unavailable — please try refreshing the page.
              </p>
            ) : (
              <ol className="mt-4 space-y-3">
                {interventions.map((i) => (
                  <li
                    key={i.rank}
                    className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                      {i.rank}
                    </span>
                    <div className="min-w-0 flex-1 text-sm leading-relaxed text-slate-800">
                      {i.action}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      {/* Why this prediction? — full width */}
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
            band reflects modelled uncertainty. Interventions on the right are
            illustrative for the demo and will be replaced by a model-driven
            recommendation engine.
          </div>
        )}
      </div>
    </div>
  );
};
