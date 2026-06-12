import { displayScore } from "@/lib/scoringEngine";
import { colourForScore, luminance } from "@/lib/scoreBand";

const NAVY = "#001D57";

function badgeTextColor(score: number): string {
  const bg = colourForScore(score);
  return luminance(bg) > 0.45 ? NAVY : "#FFFFFF";
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

  const fill = colourForScore(display);
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
