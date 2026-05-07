import { useState } from "react";
import { Info, ChevronDown } from "lucide-react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Point {
  label: string;
  historical?: number | null;
  forecast?: number | null;
  lower?: number | null;
  upper?: number | null;
}

const CURRENT_LABEL = "2025/26 Q4";
const CURRENT_SCORE = 54;

// 4 quarterly historical + 6 monthly forecast, joined at current (54).
const CHART_DATA: Point[] = [
  { label: "2025/26 Q1", historical: 62, forecast: null, lower: null, upper: null },
  { label: "2025/26 Q2", historical: 58, forecast: null, lower: null, upper: null },
  { label: "2025/26 Q3", historical: 56, forecast: null, lower: null, upper: null },
  { label: "2025/26 Q4", historical: 54, forecast: 54, lower: 50, upper: 58 },
  { label: "Jan 2027", historical: null, forecast: 51, lower: 47, upper: 55 },
  { label: "Feb 2027", historical: null, forecast: 48, lower: 44, upper: 52 },
  { label: "Mar 2027", historical: null, forecast: 46, lower: 42, upper: 50 },
  { label: "Apr 2027", historical: null, forecast: 44, lower: 40, upper: 48 },
  { label: "May 2027", historical: null, forecast: 43, lower: 39, upper: 47 },
  { label: "Jun 2027", historical: null, forecast: 43, lower: 39, upper: 47 },
];

const BANDS = [
  { label: "Critical", min: 0, max: 40, swatch: "bg-red-400" },
  { label: "At Risk", min: 40, max: 60, swatch: "bg-amber-400" },
  { label: "Stable", min: 60, max: 80, swatch: "bg-blue-400" },
  { label: "Strong", min: 80, max: 100, swatch: "bg-emerald-400" },
];

interface Intervention {
  rank: number;
  title: string;
  uplift: number;
  detail: string;
}

const INTERVENTIONS: Intervention[] = [
  {
    rank: 1,
    title: "Activate temporary staffing framework for nursing and AHP roles",
    uplift: 6,
    detail:
      "Pre-vetted agency frameworks have been shown to close vacancy-rate gaps of 2–4 percentage points within three to six months in NHS-comparable settings, particularly in nursing and Allied Health Professional (AHP) roles, by reducing time-to-hire and stabilising rotas.",
  },
  {
    rank: 2,
    title: "Stand up winter pressures workforce response group",
    uplift: 4,
    detail:
      "Winter pressures response groups coordinate cross-directorate redeployment, occupational-health surge capacity, and absence management. Comparable trusts have reduced sickness absence rates by 0.5–1.5 percentage points across a winter.",
  },
  {
    rank: 3,
    title: "Stay-interview programme for hard-to-fill roles",
    uplift: 3,
    detail:
      "Stay-interview programmes have been shown to reduce voluntary turnover by 1–2 percentage points over six months in NHS-comparable settings.",
  },
  {
    rank: 4,
    title: "Mandatory training catch-up campaign",
    uplift: 3,
    detail:
      "30-day mandatory training campaigns with directorate-level accountability have lifted compliance by 10–20 percentage points in NHS-comparable settings, reducing Care Quality Commission (CQC) scrutiny risk and supporting a safer skill-mix.",
  },
  {
    rank: 5,
    title: "Local team listening sessions, exec-sponsored",
    uplift: 2,
    detail:
      "Exec-sponsored team listening sessions in low-engagement directorates have been shown to lift engagement scores by 0.2–0.4 over six months, primarily by closing the perceived voice gap between staff and leadership.",
  },
];

function upliftStyles(uplift: number): string {
  if (uplift >= 5) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (uplift >= 3) return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

export const AiRiskPredictionTab = () => {
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      {/* Mockup chip */}
      <div className="flex flex-wrap items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              role="button"
              aria-describedby="prediction-mockup-tooltip"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Info size={12} aria-hidden />
              Mockup — not yet live
            </span>
          </TooltipTrigger>
          <TooltipContent id="prediction-mockup-tooltip" role="tooltip" className="max-w-xs">
            This module is shown for the 14 May demo as a static preview. Functional build follows
            post-demo.
          </TooltipContent>
        </Tooltip>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">AI Risk Prediction</h1>
        <p className="mt-1 text-sm text-slate-600">
          Forward outlook for the next 6 months, based on current trend and modelled interventions
        </p>
      </div>

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

            <div
              className="h-64 w-full sm:h-72"
              role="img"
              aria-label="Human Capital score trajectory: 62, 58, 56, 54 historical (last four quarters), projected to fall to 51, 48, 46, 44, 43, 43 over the next six months. Forecast confidence range plus or minus 4 points."
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={CHART_DATA}
                  margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
                >
                  <ReferenceArea y1={0} y2={40} fill="#dc2626" fillOpacity={0.05} />
                  <ReferenceArea y1={40} y2={60} fill="#f59e0b" fillOpacity={0.05} />
                  <ReferenceArea y1={60} y2={80} fill="#3b82f6" fillOpacity={0.05} />
                  <ReferenceArea y1={80} y2={100} fill="#10b981" fillOpacity={0.05} />

                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#475569" }}
                    tickLine={false}
                    axisLine={{ stroke: "#cbd5e1" }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 40, 60, 80, 100]}
                    tick={{ fontSize: 11, fill: "#475569" }}
                    tickLine={false}
                    axisLine={{ stroke: "#cbd5e1" }}
                    width={36}
                  />

                  <RTooltip content={<ChartTooltip />} />

                  {/* Confidence band */}
                  <Area
                    type="monotone"
                    dataKey={(d: Point) =>
                      d.lower != null && d.upper != null ? [d.lower, d.upper] : null
                    }
                    stroke="none"
                    fill="#1E5BB8"
                    fillOpacity={0.15}
                    isAnimationActive={false}
                    activeDot={false}
                    legendType="none"
                    connectNulls={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="historical"
                    stroke="#1E5BB8"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#1E5BB8" }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#1E5BB8"
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    dot={{ r: 4, fill: "#ffffff", stroke: "#1E5BB8", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                    connectNulls={false}
                  />

                  <ReferenceDot
                    x={CURRENT_LABEL}
                    y={CURRENT_SCORE}
                    r={6}
                    fill="#0f172a"
                    stroke="#ffffff"
                    strokeWidth={2}
                    label={{
                      value: "You are here",
                      position: "top",
                      fill: "#0f172a",
                      fontSize: 11,
                      fontWeight: 600,
                      offset: 12,
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <p className="mt-3 text-sm text-slate-700">
              Projected score in 6 months: 43 (range 39–47), with the lower bound reaching into
              Critical.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {BANDS.map((b) => (
                  <div key={b.label} className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-sm ${b.swatch}`} aria-hidden />
                    <span className="text-[11px] text-slate-600">
                      {b.label} ({b.min}–{b.max})
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                Solid line = historical · Dashed line + shaded band = forecast (illustrative)
              </p>
            </div>
          </div>
        </div>

        {/* Right — interventions (≈40%) */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="text-base font-semibold text-slate-900">Priority interventions</h3>
            <ul className="mt-4 space-y-3">
              {INTERVENTIONS.map((i) => {
                const open = expanded === i.rank;
                return (
                  <li
                    key={i.rank}
                    className="rounded-lg border border-slate-200 bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : i.rank)}
                      aria-expanded={open}
                      className="flex w-full items-start gap-3 p-4 text-left"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                        {i.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900">{i.title}</div>
                        <span
                          className={`mt-2 inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-xs font-semibold tabular-nums ${upliftStyles(
                            i.uplift,
                          )}`}
                        >
                          +{i.uplift} to score
                        </span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`mt-1 shrink-0 text-slate-500 transition-transform ${
                          open ? "rotate-180" : ""
                        }`}
                        aria-hidden
                      />
                    </button>
                    {open && (
                      <div className="border-t border-slate-200 px-4 py-3 text-base leading-relaxed text-slate-700">
                        {i.detail}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
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
            This projection extrapolates the current trend in vacancy rate and sickness absence
            forward 6 months and assumes no new interventions are taken. The shaded band reflects
            modelled uncertainty. Interventions on the right are ranked by expected uplift on the
            composite score; the ranking is rule-based for the demo and will be replaced with a
            model-driven recommendation engine post-demo.
          </div>
        )}
      </div>
    </div>
  );
};

const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: unknown; payload: Point }>;
  label?: string;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  const isForecast = p.forecast != null && p.historical == null;
  const score = isForecast ? p.forecast : p.historical;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="font-semibold text-slate-900">{label}</div>
      <div className="mt-1 text-slate-700">
        Score: <span className="font-mono tabular-nums">{score}</span>
      </div>
      {isForecast && p.lower != null && p.upper != null && (
        <div className="mt-0.5 text-slate-500">
          Range:{" "}
          <span className="font-mono tabular-nums">
            {p.lower}–{p.upper}
          </span>
        </div>
      )}
      <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
        {isForecast ? "Forecast" : "Historical"}
      </div>
    </div>
  );
};
