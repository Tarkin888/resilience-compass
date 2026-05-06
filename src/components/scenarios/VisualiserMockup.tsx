import type { Scenario } from "./scenarios";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  scenario: Scenario | null;
}

export const VisualiserMockup = ({ scenario }: Props) => {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Info size={12} aria-hidden />
              Mockup — not yet live
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            This module is shown for the 14 May demo as a static preview. Functional build follows
            post-demo.
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        {scenario ? (
          <>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Scenario loaded
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{scenario.title}</h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">{scenario.description}</p>
            <div className="mt-6 inline-flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Estimated score impact
              </span>
              <span className="font-mono text-base tabular-nums text-slate-900">
                {scenario.baseScore} → {scenario.projectedScore}
              </span>
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-600">
            No scenario loaded. Choose one from the Scenario Testing Library.
          </div>
        )}
        <p className="mt-8 text-xs text-slate-500">
          Full before/after visualisation will be built post-demo.
        </p>
      </div>
    </div>
  );
};
