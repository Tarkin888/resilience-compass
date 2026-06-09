import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useScoreHistory } from "@/hooks/useScoreHistory";
import { useDashboardForecast } from "@/hooks/useDashboardForecast";
import { classifyTrend, spcChipClasses } from "@/lib/spc";

const RAG_RED = "#DC2626";
const RAG_AMBER = "#F59E0B";
const RAG_GREEN = "#16A34A";
const FORECAST_COLOR = "#6366F1"; // indigo — visually distinct from amber actuals

function formatPeriod(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function lookAheadLabel(
  direction: string,
  method: string,
  horizon: number,
): string {
  if (method === "none") return "";
  const window = `next ${horizon} month${horizon === 1 ? "" : "s"}`;
  switch (direction) {
    case "Steady":
      return ` — projected to remain steady (${window})`;
    case "Improving":
      return ` — projected to keep improving if trend holds (${window})`;
    case "Worsening":
      return ` — projected to keep worsening if trend holds (${window})`;
    default:
      return "";
  }
}

export const TrendPanel = () => {
  const { points, loading } = useScoreHistory("dashboard", "dashboard");
  const forecast = useDashboardForecast();
  const [showLimits, setShowLimits] = useState(false);
  const [showForecast, setShowForecast] = useState(false);

  const actuals = useMemo(
    () =>
      points.map((p) => ({
        period: formatPeriod(p.snapshot_date),
        date: p.snapshot_date,
        score: Math.round(p.normalised_score),
      })),
    [points],
  );

  const spc = useMemo(
    () => classifyTrend(actuals.map((s) => s.score)),
    [actuals],
  );

  // Build chart data: actuals carry `score` only; forecast rows carry
  // `forecast` + `band` (a two-element [lower, upper] tuple). Join row is the
  // last actual duplicated into the forecast keys so the dashed line and
  // shaded band start exactly at the latest actual point — no gap, no jump.
  const chartData = useMemo(() => {
    const base = actuals.map((a) => ({
      period: a.period,
      score: a.score,
      forecast: undefined as number | undefined,
      band: undefined as [number, number] | undefined,
    }));
    if (!showForecast || forecast.points.length === 0 || base.length === 0) {
      return base;
    }
    const last = actuals[actuals.length - 1];
    base[base.length - 1] = {
      ...base[base.length - 1],
      forecast: last.score,
      band: [last.score, last.score],
    };
    for (const p of forecast.points) {
      base.push({
        period: formatPeriod(p.date),
        score: undefined as unknown as number,
        forecast: p.value,
        band: [p.lower, p.upper],
      });
    }
    return base;
  }, [actuals, forecast.points, showForecast]);

  const isEmpty = !loading && actuals.length === 0;
  const firstLabel = actuals[0]?.period;
  const lastLabel = actuals[actuals.length - 1]?.period;
  const canForecast = forecast.method !== "none" && forecast.points.length > 0;
  const lookAhead = canForecast
    ? lookAheadLabel(spc.direction, forecast.method, forecast.points.length)
    : "";

  return (
    <section className="w-full px-4 pt-2 pb-4 sm:px-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Score over time
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              title={`${spc.tooltip}${
                showForecast && canForecast
                  ? ` Forecast method: ${forecast.method}.`
                  : ""
              }`}
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${spcChipClasses(spc.direction)}`}
            >
              {spc.direction}
              {showForecast && canForecast ? lookAhead : ""}
            </span>
            {actuals.length >= 8 && (
              <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-slate-500">
                <input
                  type="checkbox"
                  checked={showLimits}
                  onChange={(e) => setShowLimits(e.target.checked)}
                  className="h-3 w-3"
                />
                Control limits
              </label>
            )}
            {canForecast && (
              <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-slate-500">
                <input
                  type="checkbox"
                  checked={showForecast}
                  onChange={(e) => setShowForecast(e.target.checked)}
                  className="h-3 w-3"
                />
                Show forecast
              </label>
            )}
          </div>
        </div>

        {isEmpty ? (
          <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-xs text-slate-500 sm:h-32">
            Historical data not yet available — run backfill from the Admin
            page to populate the score history.
          </div>
        ) : loading ? (
          <div className="flex h-28 items-center justify-center text-xs text-slate-400 sm:h-32">
            Loading historical scores…
          </div>
        ) : (
          <>
            <div className="h-32 w-full sm:h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id="bgRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={RAG_RED} stopOpacity={0.08} />
                      <stop offset="100%" stopColor={RAG_RED} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis domain={[0, 100]} hide />
                  <XAxis
                    dataKey="period"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 11 }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <ReferenceLine y={25} stroke={RAG_RED} strokeDasharray="2 3" strokeOpacity={0.6} />
                  <ReferenceLine y={75} stroke={RAG_GREEN} strokeDasharray="2 3" strokeOpacity={0.6} />
                  {showLimits && spc.ucl != null && (
                    <ReferenceLine y={spc.ucl} stroke="#0F172A" strokeDasharray="4 2" strokeOpacity={0.4} label={{ value: "UCL", fontSize: 10, fill: "#475569", position: "right" }} />
                  )}
                  {showLimits && spc.lcl != null && (
                    <ReferenceLine y={spc.lcl} stroke="#0F172A" strokeDasharray="4 2" strokeOpacity={0.4} label={{ value: "LCL", fontSize: 10, fill: "#475569", position: "right" }} />
                  )}
                  {showLimits && spc.mean != null && (
                    <ReferenceLine y={spc.mean} stroke="#64748B" strokeOpacity={0.6} label={{ value: "Mean", fontSize: 10, fill: "#475569", position: "right" }} />
                  )}
                  <Tooltip
                    formatter={(v: number | [number, number], name: string) => {
                      if (name === "band" && Array.isArray(v)) {
                        return [`${v[0]} – ${v[1]}`, "Projected range"];
                      }
                      if (name === "forecast") return [`${v}`, "Projection"];
                      return [`${v}`, "Score"];
                    }}
                    labelFormatter={(l: string) => l}
                    contentStyle={{ fontSize: 12 }}
                  />
                  {showForecast && canForecast && (
                    <Area
                      type="monotone"
                      dataKey="band"
                      stroke="none"
                      fill={FORECAST_COLOR}
                      fillOpacity={0.12}
                      isAnimationActive={false}
                      activeDot={false}
                      connectNulls
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke={RAG_AMBER}
                    strokeWidth={2}
                    fill="url(#bgRed)"
                    isAnimationActive={false}
                    dot={{ r: 2.5, stroke: "#fff", strokeWidth: 1 }}
                    activeDot={{ r: 4 }}
                  />
                  {showForecast && canForecast && (
                    <Area
                      type="monotone"
                      dataKey="forecast"
                      stroke={FORECAST_COLOR}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      fill="transparent"
                      isAnimationActive={false}
                      dot={{ r: 2.5, stroke: "#fff", strokeWidth: 1, fill: FORECAST_COLOR }}
                      activeDot={{ r: 4 }}
                      connectNulls
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Source: NHS England, {firstLabel} – {lastLabel}. {actuals.length} data points.
              Trend classified using NHS Making Data Count (XmR) rules.
            </p>
            <p className="mt-1 text-[11px] italic text-slate-500">
              Trend reflects movement in the two live measures (staff vacancies,
              sickness absence); other indicators held at current levels pending
              historical data.
            </p>
            {showForecast && canForecast && (
              <p className="mt-1 text-[11px] italic text-indigo-700/80">
                {forecast.caption} Other indicators held flat across the
                horizon; shown as a projection, not a prediction.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
};
