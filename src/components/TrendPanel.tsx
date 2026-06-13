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
import { classifyTrend, spcChipClasses } from "@/lib/spc";

const RAG_RED = "#DC2626";
const RAG_AMBER = "#F59E0B";
const RAG_GREEN = "#16A34A";

function formatPeriod(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

export const TrendPanel = () => {
  const { points, loading } = useScoreHistory("dashboard", "dashboard");
  const [showLimits, setShowLimits] = useState(false);

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

  const isEmpty = !loading && actuals.length === 0;
  const firstLabel = actuals[0]?.period;
  const lastLabel = actuals[actuals.length - 1]?.period;

  return (
    <section className="w-full px-4 pt-2 pb-4 sm:px-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Score over time
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              title={spc.tooltip}
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${spcChipClasses(spc.direction)}`}
            >
              {spc.direction}
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
                <AreaChart data={actuals} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
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
                    formatter={(v: number) => [`${v}`, "Score"]}
                    labelFormatter={(l: string) => l}
                    contentStyle={{ fontSize: 12 }}
                  />
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
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Source: NHS England, {firstLabel} – {lastLabel}. {actuals.length} data points.
              Trend classified using NHS Making Data Count (XmR) rules.
            </p>
            <p className="mt-1 text-[11px] italic text-slate-500">
              History only — the forecast is shown on the AI Risk Prediction tab.
            </p>
          </>
        )}
      </div>
    </section>
  );
};
