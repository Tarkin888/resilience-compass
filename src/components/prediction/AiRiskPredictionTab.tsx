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
import { SCORE_BANDS } from "@/components/scenarios/scenarioImpacts";

type Horizon = "3m" | "6m" | "12m";

interface Point {
  quarter: string;
  historical?: number | null;
  forecast?: number | null;
  lower?: number | null;
  upper?: number | null;
  band?: [number, number] | null;
}

const CURRENT_QUARTER = "2025/26 Q4";
const CURRENT_SCORE = 54;

// Solid line: historical only (with current). Dashed line: forecast (joined at current).
const CHART_DATA: Point[] = [
  { quarter: "2025/26 Q1", historical: 62, forecast: null, lower: null, upper: null },
  { quarter: "2025/26 Q2", historical: 58, forecast: null, lower: null, upper: null },
  { quarter: "2025/26 Q3", historical: 56, forecast: null, lower: null, upper: null },
  // Join point: present in both series; confidence band starts here as zero-width
  { quarter: "2025/26 Q4", historical: 54, forecast: 54, lower: 54, upper: 54 },
  { quarter: "2026/27 Q1", historical: null, forecast: 52, lower: 50, upper: 54 },
  { quarter: "2026/27 Q2", historical: null, forecast: 49, lower: 45, upper: 53 },
  { quarter: "2026/27 Q3", historical: null, forecast: 46, lower: 41, upper: 51 },
  { quarter: "2026/27 Q4", historical: null, forecast: 44, lower: 38, upper: 50 },
];

interface Intervention {
  rank: number;
  title: string;
  description: string;
  uplift: number;
  targets: string;
}

const INTERVENTIONS: Intervention[] = [
  {
    rank: 1,
    title: "Targeted nursing recruitment campaign",
    description:
      "Accelerated international recruitment programme combined with a retention bonus for nursing roles.",
    uplift: 6,
    targets: "Staff Vacancies",
  },
  {
    rank: 2,
    title: "Sickness absence intervention bundle",
    description:
      "Wellbeing programme, early occupational health referral, and structured return-to-work support.",
    uplift: 5,
    targets: "Sickness Absence",
  },
  {
    rank: 3,
    title: "Mid-career retention package",
    description:
      "Career development pathways, flexible working, and a recognition scheme for staff with 5–15 years' service.",
    uplift: 4,
    targets: "Voluntary Turnover, Engagement",
  },
  {
    rank: 4,
    title: "Statutory training catch-up campaign",
    description:
      "30-day mandatory training compliance drive with directorate-level accountability.",
    uplift: 2,
    targets: "Training Compliance",
  },
  {
    rank: 5,
    title: "Local team listening sessions",
    description:
      "Exec-sponsored fortnightly listening forums in the lowest-engagement directorates.",
    uplift: 1,
    targets: "Engagement",
  },
];

export const AiRiskPredictionTab = () => {
  const [horizon, setHorizon] = useState<Horizon>("12m");
  const [explainerOpen, setExplainerOpen] = useState(false);

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

      {/* Horizon selector — mockup affordance, does not change chart data (D-09 / OQ-07) */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Forecast horizon</span>
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5 shadow-sm">
          {(
            [
              { id: "3m", label: "3 months" },
              { id: "6m", label: "6 months" },
              { id: "12m", label: "12 months" },
            ] as Array<{ id: Horizon; label: string }>
          ).map((p) => {
            const active = horizon === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setHorizon(p.id)}
                aria-pressed={active}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-brand text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Score trajectory chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Human Capital score trajectory
          </h2>
          <span className="text-xs text-slate-500">0–100 scale</span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={CHART_DATA}
              margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
            >
              {/* Band shading behind plot area */}
              <ReferenceArea y1={0} y2={40} fill="#fecaca" fillOpacity={0.35} />
              <ReferenceArea y1={40} y2={55} fill="#fde68a" fillOpacity={0.35} />
              <ReferenceArea y1={55} y2={70} fill="#bfdbfe" fillOpacity={0.35} />
              <ReferenceArea y1={70} y2={100} fill="#bbf7d0" fillOpacity={0.35} />

              <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="quarter"
                tick={{ fontSize: 11, fill: "#475569" }}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 40, 55, 70, 100]}
                tick={{ fontSize: 11, fill: "#475569" }}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
                width={36}
              />

              <RTooltip content={<ChartTooltip />} />

              {/* Confidence band — only forecast rows have lower/upper */}
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="#1E5BB8"
                fillOpacity={0.0}
                isAnimationActive={false}
                activeDot={false}
                legendType="none"
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="#ffffff"
                fillOpacity={0}
                isAnimationActive={false}
                activeDot={false}
                legendType="none"
              />
              {/* Render shaded band as a stacked composition: use a single Area between lower/upper via custom approach */}
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

              {/* Historical solid line */}
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
              {/* Forecast dashed line */}
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

              {/* "You are here" marker on current quarter */}
              <ReferenceDot
                x={CURRENT_QUARTER}
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Solid line = historical · Dashed line + shaded band = forecast (illustrative)
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {SCORE_BANDS.map((b) => (
              <div key={b.label} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-sm ${b.swatch}`} aria-hidden />
                <span className="text-[11px] text-slate-600">
                  {b.label} ({b.min}–{b.max})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. AI narrative panel */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Why this prediction
        </div>
        <p className="mt-2 text-base leading-relaxed text-slate-700">
          On the current four-quarter trajectory, the Human Capital score is projected to fall to
          44 by 2026/27 Q4 — approaching the Critical range, with the lower bound of the forecast
          (38) sitting inside Critical — if no targeted interventions are implemented. The
          dominant drivers are sustained sickness absence above the pre-pandemic
          benchmark and a vacancy rate that has not closed. Implementing the top three recommended
          interventions in combination could counteract the decline and stabilise the score in the
          55–60 range over the same horizon.
        </p>
        <p className="mt-4 text-xs italic text-slate-500">
          Forecast generated for the 14 May demo. The full AI prediction model is built post-demo.
        </p>
      </div>

      {/* 3. Ranked intervention recommendations */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Recommended interventions</h3>
        <p className="mt-1 text-xs text-slate-500">
          Ranked by expected uplift to the Human Capital score (illustrative).
        </p>
        <ul className="mt-4 space-y-3">
          {INTERVENTIONS.map((i) => (
            <li
              key={i.rank}
              className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {i.rank}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900">{i.title}</div>
                <p className="mt-1 text-base text-slate-600">{i.description}</p>
                <span className="mt-2 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  Targets: {i.targets}
                </span>
              </div>
              <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-emerald-700">
                +{i.uplift} to score
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* 4. Explainability panel */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setExplainerOpen((v) => !v)}
          aria-expanded={explainerOpen}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <span className="text-sm font-semibold text-slate-900">
            How this prediction is made
          </span>
          <ChevronDown
            size={16}
            className={`text-slate-500 transition-transform ${
              explainerOpen ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>
        {explainerOpen && (
          <div className="space-y-4 border-t border-slate-200 px-6 py-5 text-sm text-slate-700">
            <Subsection title="Inputs">
              Four quarters of historical Human Capital score (2025/26 Q1–Q4): 62, 58, 56, 54.
            </Subsection>
            <Subsection title="Method">
              Simplified linear extrapolation of the historical score trend, with widening
              confidence bands across the forecast horizon. The full model — incorporating
              KRI-level trends, scenario probabilities, and intervention uplift — is built
              post-demo.
            </Subsection>
            <Subsection title="Confidence">
              Low. Four historical data points is below the threshold for a robust forecast.
              Treat the trajectory as directional, not predictive.
            </Subsection>
            <Subsection title="What this is not">
              This is not an AI-generated narrative for the demo. The narrative shown above is
              hardcoded illustrative copy. The functional build will use a Claude API call to
              generate a fresh narrative on each prediction run.
            </Subsection>
          </div>
        )}
      </div>
    </div>
  );
};

const Subsection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
    <p className="mt-1 leading-relaxed">{children}</p>
  </div>
);

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
          Range: <span className="font-mono tabular-nums">{p.lower}–{p.upper}</span>
        </div>
      )}
      <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
        {isForecast ? "Forecast" : "Historical"}
      </div>
    </div>
  );
};
