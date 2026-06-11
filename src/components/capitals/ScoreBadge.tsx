import type { Rag } from "@/lib/scoringEngine";
import { displayScore, ragBand } from "@/lib/scoringEngine";
import { RED, AMBER, GREEN } from "@/lib/scoreBand";

const NAVY = "#001D57";

function ragColor(score: number): string {
  const band = ragBand(score);
  if (band === "red") return RED;
  if (band === "green") return GREEN;
  return AMBER;
}

function badgeTextColor(score: number): string {
  const band = ragBand(score);
  if (band === "red" || band === "green") return "#FFFFFF";
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
