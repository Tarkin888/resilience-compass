import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScoreScale } from "@/components/ScoreScale";
import { MethodologyDialog } from "@/components/MethodologyDialog";
import { supabase } from "@/integrations/supabase/client";
import { useHumanCapitalData } from "@/hooks/useHumanCapitalData";
import { pillarScoreById } from "@/lib/pillarScores";

const LIVE_KRIS = ["sickness_absence", "vacancy"];

export const ScoreCard = () => {
  const [stale, setStale] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const methodologyTriggerRef = useRef<HTMLButtonElement>(null);
  const { data, loading } = useHumanCapitalData();

  const humanScore = useMemo(() => {
    const liveValues: Record<string, number | null> = {};
    Object.entries(data.capturesByKri).forEach(([kriId, caps]) => {
      const latest = caps[0];
      liveValues[kriId] = latest ? Number(latest.headline_value) : null;
    });
    return pillarScoreById(liveValues, "human");
  }, [data]);

  const humanReady = !loading &&
    data.capturesByKri["vacancy"]?.[0]?.headline_value != null &&
    data.capturesByKri["sickness_absence"]?.[0]?.headline_value != null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: caps } = await supabase
        .from("kri_captures")
        .select("kri_id,captured_at")
        .in("kri_id", LIVE_KRIS)
        .order("captured_at", { ascending: false });
      if (cancelled) return;
      const latest: Record<string, string> = {};
      (caps ?? []).forEach((c: { kri_id: string; captured_at: string }) => {
        if (!latest[c.kri_id]) latest[c.kri_id] = c.captured_at;
      });
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const isStale = LIVE_KRIS.some((k) => {
        const t = latest[k] ? new Date(latest[k]).getTime() : 0;
        return !t || t < sevenDaysAgo;
      });
      setStale(isStale);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="w-full sm:shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {humanReady ? (
                  <ScoreScale score={humanScore ?? 0} size="large" label="Human Capital score" />
                ) : (
                  <div className="w-full">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Human Capital score
                    </div>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-5xl font-semibold leading-none tabular-nums text-slate-300 sm:text-6xl">
                        —
                      </span>
                    </div>
                    <p className="mt-1 text-base text-slate-400">Loading…</p>
                  </div>
                )}
              </div>
              <button
                ref={methodologyTriggerRef}
                type="button"
                onClick={() => setMethodologyOpen(true)}
                className="mt-1 inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-accent2 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent2"
              >
                <Info size={14} aria-hidden />
                How scoring works
              </button>
              {stale && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={0}
                      role="button"
                      aria-describedby="score-stale-tooltip"
                      className="mt-1 inline-flex items-center text-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                    >
                      <AlertTriangle size={20} aria-hidden />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent id="score-stale-tooltip" role="tooltip" className="max-w-xs">
                    Live data is stale — figure shown is from last successful capture.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>
      <MethodologyDialog
        open={methodologyOpen}
        onOpenChange={setMethodologyOpen}
        returnFocusRef={methodologyTriggerRef}
      />
    </section>
  );
};

