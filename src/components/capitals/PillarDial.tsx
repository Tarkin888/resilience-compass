import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { scoreBandColor } from "@/lib/scoreBand";

type Trend = "up" | "down" | "flat";

interface Props {
  name: string;
  score: number | null;
  trend: Trend;
  trendLabel: string;
  onViewDetails: () => void;
}

const NAVY = "#001D57";

export const PillarDial = ({ name, score, trend, trendLabel, onViewDetails }: Props) => {
  const color = scoreBandColor(score);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - pct / 100);

  const TrendIcon = trend === "down" ? TrendingDown : trend === "up" ? TrendingUp : Minus;
  const trendColor =
    trend === "down" ? "text-red-700 bg-red-50" : trend === "up" ? "text-emerald-700 bg-emerald-50" : "text-slate-600 bg-slate-100";

  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: NAVY }}>
        {name}
      </div>
      <div className="relative mt-2">
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="10" />
          {score != null && (
            <circle
              cx="55"
              cy="55"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 55 55)"
            />
          )}
          <text
            x="55"
            y="58"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="22"
            fontWeight="700"
            fill={color}
          >
            {score ?? "—"}
          </text>
          <text x="55" y="76" textAnchor="middle" fontSize="10" fill="#64748B">
            /100
          </text>
        </svg>
      </div>
      <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${trendColor}`}>
        <TrendIcon size={12} aria-hidden />
        {trendLabel}
      </span>
      <button
        type="button"
        onClick={onViewDetails}
        className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        style={{ color: NAVY }}
      >
        View details
      </button>
    </div>
  );
};
