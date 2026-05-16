import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trendBadgeClasses, type TrendAssessment } from "@/lib/trendAssessment";

interface TrendLabelProps {
  assessment: TrendAssessment;
  className?: string;
}

export const TrendLabel = ({ assessment, className = "" }: TrendLabelProps) => {
  const { direction, tooltip, caveat } = assessment;
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${trendBadgeClasses(
          direction,
        )}`}
      >
        {direction}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`What does ${direction} mean?`}
              className="inline-flex items-center justify-center rounded-full text-current/70 hover:text-current focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <Info size={13} aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs leading-relaxed">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </span>
      {caveat && (
        <span className="text-[11px] italic text-slate-500">{caveat}</span>
      )}
    </span>
  );
};
