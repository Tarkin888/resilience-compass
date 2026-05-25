import { useId } from "react";

export type ScoreScaleSize = "large" | "compact";

interface Props {
  score: number;
  size?: ScoreScaleSize;
  label?: string;
  className?: string;
}

const THRESHOLD = 25;
const TARGET = 75;

type Zone = "below" | "operating" | "ontarget";

function zoneFor(score: number): Zone {
  if (score < THRESHOLD) return "below";
  if (score < TARGET) return "operating";
  return "ontarget";
}

interface ZoneTokens {
  number: string;
  caption: string;
  pointer: string;
  pointerFill: string;
  phrase: string;
  relation: string;
}

function tokensFor(score: number): ZoneTokens {
  const zone = zoneFor(score);
  if (zone === "below") {
    return {
      number: "text-red-700",
      caption: "text-red-700",
      pointer: "border-red-700",
      pointerFill: "fill-red-700",
      phrase: "below minimum threshold",
      relation: "action required",
    };
  }
  if (zone === "operating") {
    return {
      number: "text-amber-700",
      caption: "text-amber-800",
      pointer: "border-amber-600",
      pointerFill: "fill-amber-600",
      phrase: "within the operating range",
      relation: "below target",
    };
  }
  return {
    number: "text-emerald-700",
    caption: "text-emerald-800",
    pointer: "border-emerald-700",
    pointerFill: "fill-emerald-700",
    phrase: "at or above target",
    relation: "",
  };
}

function buildCaption(score: number): { text: string; overTarget: boolean } {
  const t = tokensFor(score);
  const overTarget = score >= 90;
  const tail = t.relation ? `, ${t.relation}` : "";
  return {
    text: `${score} — ${t.phrase}${tail}`,
    overTarget,
  };
}

function buildAriaLabel(score: number, label?: string): string {
  const t = tokensFor(score);
  const prefix = label ? `${label}: ` : "";
  const tail = t.relation ? `, ${t.relation}` : "";
  const overTarget = score >= 90 ? ". Review — above target." : "";
  return `${prefix}${score} on a 0 to 100 scale. ${capitalise(t.phrase)}${tail}. Threshold 25, target 75.${overTarget}`;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const ScoreScale = ({ score, size = "large", label, className = "" }: Props) => {
  const tokens = tokensFor(score);
  const caption = buildCaption(score);
  const captionId = useId();
  const isLarge = size === "large";

  const numberCls = isLarge
    ? "text-5xl sm:text-6xl"
    : "text-3xl sm:text-4xl";

  const trackHeight = isLarge ? "h-3" : "h-2";
  const pos = Math.max(0, Math.min(100, score));

  return (
    <div
      className={`w-full ${className}`}
      role="img"
      aria-label={buildAriaLabel(score, label)}
    >
      {/* Number + caption */}
      <div className={isLarge ? "flex flex-col gap-1" : "flex flex-col gap-0.5"}>
        {label && (
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </div>
        )}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={`font-semibold leading-none tabular-nums ${numberCls} ${tokens.number}`}>
            {score}
          </span>
          {caption.overTarget && (
            <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              Review — above target
            </span>
          )}
        </div>
        <p
          id={captionId}
          className={`${isLarge ? "text-base" : "text-sm"} ${tokens.caption}`}
        >
          {caption.text}
        </p>
      </div>

      {/* Track */}
      <div className={isLarge ? "mt-5" : "mt-3"}>
        <div className="relative">
          {/* Zones */}
          <div
            className={`relative ${trackHeight} w-full overflow-hidden rounded-full`}
            aria-hidden
          >
            <div className="absolute inset-y-0 left-0 bg-red-200" style={{ width: `${THRESHOLD}%` }} />
            <div
              className="absolute inset-y-0 bg-amber-200"
              style={{ left: `${THRESHOLD}%`, width: `${TARGET - THRESHOLD}%` }}
            />
            <div
              className="absolute inset-y-0 bg-emerald-200"
              style={{ left: `${TARGET}%`, width: `${100 - TARGET}%` }}
            />
            {/* Threshold + target rules */}
            <div
              className="absolute inset-y-0 w-px bg-slate-700/60"
              style={{ left: `${THRESHOLD}%` }}
            />
            <div
              className="absolute inset-y-0 w-px bg-slate-700/60"
              style={{ left: `${TARGET}%` }}
            />
          </div>

          {/* Pointer */}
          <div
            className="pointer-events-none absolute -translate-x-1/2"
            style={{ left: `${pos}%`, top: isLarge ? "-10px" : "-8px" }}
            aria-hidden
          >
            <svg
              width={isLarge ? 14 : 12}
              height={isLarge ? 8 : 6}
              viewBox="0 0 14 8"
              className={tokens.pointerFill}
            >
              <path d="M7 8 L0 0 L14 0 Z" />
            </svg>
          </div>
          <div
            className={`pointer-events-none absolute ${trackHeight} w-0.5 -translate-x-1/2 ${tokens.pointer.replace("border-", "bg-")}`}
            style={{ left: `${pos}%`, top: 0 }}
            aria-hidden
          />
        </div>

        {/* Tick row */}
        <div className="relative mt-1.5 h-3" aria-hidden>
          {[0, 25, 50, 75, 100].map((t) => (
            <span
              key={t}
              className="absolute -translate-x-1/2 text-[10px] tabular-nums text-slate-500"
              style={{ left: `${t}%` }}
            >
              {t}
            </span>
          ))}
        </div>

        {/* Marker labels */}
        {isLarge ? (
          <div className="relative mt-3 h-10" aria-hidden>
            <div
              className="absolute -translate-x-1/2 text-center"
              style={{ left: `${THRESHOLD}%` }}
            >
              <div className="text-[11px] font-semibold text-slate-700">
                Threshold (25)
              </div>
              <div className="text-[10px] text-slate-500">
                level we don't want to breach
              </div>
            </div>
            <div
              className="absolute -translate-x-1/2 text-center"
              style={{ left: `${TARGET}%` }}
            >
              <div className="text-[11px] font-semibold text-slate-700">
                Target (75)
              </div>
              <div className="text-[10px] text-slate-500">
                where we want to be in normal conditions
              </div>
            </div>
          </div>
        ) : (
          <div className="relative mt-1.5 h-4" aria-hidden>
            <span
              className="absolute -translate-x-1/2 text-[10px] font-medium text-slate-600"
              style={{ left: `${THRESHOLD}%` }}
            >
              Threshold
            </span>
            <span
              className="absolute -translate-x-1/2 text-[10px] font-medium text-slate-600"
              style={{ left: `${TARGET}%` }}
            >
              Target
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
