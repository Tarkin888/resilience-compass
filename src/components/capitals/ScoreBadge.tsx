import type { Rag } from "@/lib/scoringEngine";
import { displayScore } from "@/lib/scoringEngine";

const RED = "#DC2626";
const AMBER = "#F59E0B";
const GREEN = "#16A34A";
const NAVY = "#001D57";

function ragColor(score: number): string {
  if (score < 25) return RED;
  if (score < 75) return AMBER;
  return GREEN;
}

function badgeTextColor(score: number): string {
  if (score < 25 || score >= 75) return "#FFFFFF";
  return NAVY;
}

interface Props {
  score: number | null;
  size?: "sm" | "md";
  className?: string;
}

export const ScoreBadge = ({ score, size = "md", className = "" }: Props) => {
  const display = displayScore(score);
  const isUnavailable = display == null;

  const sizeClass = size === "sm" ? "h-9 w-9 text-sm" : "h-11 w-11 text-base";

  if (isUnavailable) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-xs font-semibold text-slate-400 ${sizeClass} ${className}`}
        aria-label="Score unavailable"
        title="Score unavailable"
      >
        —
      </div>
    );
  }

  const fill = ragColor(display);
  const textColor = badgeTextColor(display);

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full ${sizeClass} ${className}`}
      style={{ backgroundColor: fill, color: textColor }}
      aria-label={`Score ${display} out of 100`}
      title={`Score ${display} out of 100`}
    >
      <span className="font-bold tabular-nums">{display}</span>
    </div>
  );
};
