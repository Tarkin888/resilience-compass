import { useId, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getInterventionsForKri,
  type Intervention,
} from "@/config/interventions";

interface Props {
  kriId: string;
}

type TopN = 3 | 5;

export const PriorityInterventionsCard = ({ kriId }: Props) => {
  const [open, setOpen] = useState(false);
  const [topN, setTopN] = useState<TopN>(3);
  const all = getInterventionsForKri(kriId);
  const contentId = useId();

  if (all.length === 0) return null;

  const visible = all.slice(0, topN);
  const placeholderNeeded = topN > all.length;

  return (
    <section className="border-t border-slate-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
        aria-expanded={open}
        aria-controls={contentId}
      >
        <span className="text-sm font-semibold text-slate-900">Priority interventions</span>
        <ChevronDown
          size={16}
          className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div id={contentId} className="border-t border-slate-200 px-5 py-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div
              role="group"
              aria-label="Number of interventions to show"
              className="inline-flex items-center rounded-full bg-slate-100 p-0.5"
            >
              {([3, 5] as TopN[]).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTopN(n)}
                  aria-pressed={topN === n}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors min-h-[32px] ${
                    topN === n
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Top {n}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-md bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-600">
              Ranked by expected uplift, with evidence weight and time-to-impact as
              tiebreakers. Configured per pillar; not AI-generated.
            </p>
          </div>

          <ol className="mt-3 space-y-2">
            {visible.map((intervention, idx) => (
              <InterventionRow
                key={intervention.id}
                rank={idx + 1}
                intervention={intervention}
              />
            ))}
            {placeholderNeeded && (
              <li className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs text-slate-500">
                Additional interventions to be added in the next iteration.
              </li>
            )}
          </ol>
        </div>
      )}
    </section>
  );
};

const InterventionRow = ({
  rank,
  intervention,
}: {
  rank: number;
  intervention: Intervention;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <li className="grid grid-cols-[24px_1fr_24px] items-start gap-3 rounded-md border border-slate-200 p-3">
      <span className="pt-0.5 text-[13px] font-medium text-slate-500 tabular-nums">
        {rank}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-900">
          {intervention.title}
        </div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">
          {intervention.description}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: "#EAF3DE", color: "#3B6D11" }}
          >
            +{intervention.upliftMinPts} to +{intervention.upliftMaxPts} pts
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {intervention.timeToImpactMonths}-month horizon
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {intervention.evidence} evidence
          </span>
        </div>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Citation for intervention ${rank}: ${intervention.title}`}
            className="inline-flex h-11 w-11 items-center justify-center sm:h-6 sm:w-6"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-500 text-[11px] font-semibold text-blue-600">
              i
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[min(360px,calc(100vw-2rem))] p-0"
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Source — opened from intervention {rank}
              </div>
              <div className="mt-0.5 text-[15px] font-medium text-slate-900">
                {intervention.title}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded p-1 text-slate-500 hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>
          <dl className="space-y-2 px-4 py-3 text-sm">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Reference
              </dt>
              <dd className="mt-0.5 text-slate-800">
                {intervention.reference}
                <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-200">
                  Illustrative — source to be confirmed
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Evidence summary
              </dt>
              <dd className="mt-0.5 text-slate-800">
                {intervention.evidenceSummary}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Bank ID
              </dt>
              <dd className="mt-0.5 font-mono text-[13px] text-slate-800">
                {intervention.id}
              </dd>
            </div>
          </dl>
        </PopoverContent>
      </Popover>
    </li>
  );
};
