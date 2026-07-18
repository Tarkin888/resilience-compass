import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { scoreBandColor } from "@/lib/scoreBand";

type Trend = "up" | "down" | "flat";

interface Props {
  name: string;
  score: number | null;
  trend: Trend;
  trendLabel: string;
  status: "live" | "preview";
  onViewDetails: () => void;
}

const NAVY = "#001D57";

export const PillarDial = ({ name, score, trend, trendLabel, status, onViewDetails }: Props) => {
  const color = scoreBandColor(score);




  const TrendIcon = trend === "down" ? TrendingDown : trend === "up" ? TrendingUp : Minus;
  const trendColor =
    trend === "down" ? "text-red-700 bg-red-50" : trend === "up" ? "text-emerald-700 bg-emerald-50" : "text-slate-600 bg-slate-100";

  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="text-sm font-semibold uppercase tracking-wide text-center" style={{ color: NAVY }}>
        {name}
      </div>
      <div className="mt-2">
        {status === "live" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden />
            Live
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            Preview
          </span>
        )}
      </div>

      <div className="relative mt-3">
        <svg width="150" height="150" viewBox="0 0 150 150">
          <circle cx="75" cy="75" r="60" fill="none" stroke="#E5E7EB" strokeWidth="12" />
          {score != null && (
            <circle
              cx="75"
              cy="75"
              r="60"
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 60}
              strokeDashoffset={2 * Math.PI * 60 * (1 - Math.max(0, Math.min(100, score)) / 100)}
              transform="rotate(-90 75 75)"
            />
          )}
          <text
            x="75"
            y="78"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="32"
            fontWeight="700"
            fill={color}
          >
            {score ?? "—"}
          </text>
          <text x="75" y="104" textAnchor="middle" fontSize="12" fill="#64748B">
            /100
          </text>
        </svg>
      </div>
      <span className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${trendColor}`}>
        <TrendIcon size={14} aria-hidden />
        {trendLabel}
      </span>
      <button
        type="button"
        onClick={onViewDetails}
        className="mt-4 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        style={{ color: NAVY }}
      >
        View composition
      </button>
    </div>
  );
};
