import { ScoreBadge } from "./ScoreBadge";
import { OperatingRangeBar } from "./OperatingRangeBar";

const NAVY = "#001D57";

interface IndicatorProps {
  name: string;
  score: number;
  sublabel: string;
}

export const IndicatorRangeBar = ({ name, score, sublabel }: IndicatorProps) => {
  return (
    <div className="py-3">
      {/* Line 1: badge + label */}
      <div className="flex items-start gap-3">
        <ScoreBadge score={score} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold" style={{ color: NAVY }}>
            {name}
          </div>
          <div className="text-xs text-slate-500">{sublabel}</div>
        </div>
      </div>

      {/* Line 2: operating-range bar */}
      <div className="mt-2 pl-14">
        <OperatingRangeBar score={score} name={name} />
      </div>
    </div>
  );
};

