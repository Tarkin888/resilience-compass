interface IndicatorProps {
  name: string;
  score: number;
  sublabel: string;
}

const RED = "#DC2626";
const AMBER = "#F59E0B";
const GREEN = "#16A34A";
const TEAL = "#24BEAA";
const NAVY = "#001D57";

function ragColor(score: number) {
  if (score < 25) return RED;
  if (score < 75) return AMBER;
  return GREEN;
}

function badgeTextColor(score: number) {
  if (score < 25 || score >= 75) return "#FFFFFF";
  return NAVY;
}

export const IndicatorRangeBar = ({ name, score, sublabel }: IndicatorProps) => {
  const fill = ragColor(score);
  const textColor = badgeTextColor(score);
  const pos = Math.max(0, Math.min(100, score));

  return (
    <div className="py-3">
      {/* Line 1: badge + label */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: fill, color: textColor }}
          aria-hidden
        >
          <span className="text-base font-bold tabular-nums">{score}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold" style={{ color: NAVY }}>
            {name}
          </div>
          <div className="text-xs text-slate-500">{sublabel}</div>
        </div>
      </div>

      {/* Line 2: operating-range bar */}
      <div className="mt-2 pl-14">
        <svg
          viewBox="0 0 200 28"
          preserveAspectRatio="none"
          className="block h-7 w-full"
          role="img"
          aria-label={`${name} score ${score} out of 100. Threshold 25, target 75.`}
        >
          <defs>
            <linearGradient id={`grad-${name.replace(/\s+/g, "-")}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor={RED} />
              <stop offset="50%" stopColor={AMBER} />
              <stop offset="100%" stopColor={GREEN} />
            </linearGradient>
          </defs>
          {/* solid red 0-25 */}
          <rect x="0" y="10" width="50" height="6" fill={RED} />
          {/* gradient 25-75 */}
          <rect x="50" y="10" width="100" height="6" fill={`url(#grad-${name.replace(/\s+/g, "-")})`} />
          {/* solid green 75-100 */}
          <rect x="150" y="10" width="50" height="6" fill={GREEN} />

          {/* end dots */}
          <circle cx="2" cy="13" r="2.5" fill="#000" />
          <circle cx="198" cy="13" r="2.5" fill="#000" />

          {/* teal ticks at 25 and 75 */}
          <line x1="50" y1="6" x2="50" y2="20" stroke={TEAL} strokeWidth="2" />
          <line x1="150" y1="6" x2="150" y2="20" stroke={TEAL} strokeWidth="2" />

          {/* diamond marker */}
          <polygon
            points={`${pos * 2},6 ${pos * 2 + 4},13 ${pos * 2},20 ${pos * 2 - 4},13`}
            fill="#000"
          />
        </svg>

        {/* threshold/target labels */}
        <div className="relative mt-1 h-4 text-[10px] font-bold" style={{ color: TEAL }} aria-hidden>
          <span className="absolute -translate-x-1/2" style={{ left: "25%" }}>
            Min Threshold
          </span>
          <span className="absolute -translate-x-1/2" style={{ left: "75%" }}>
            Target
          </span>
        </div>

        {/* numeric scale */}
        <div className="relative mt-0.5 h-3 text-[10px] tabular-nums text-slate-500" aria-hidden>
          {[0, 25, 75, 100].map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: `${t}%` }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
