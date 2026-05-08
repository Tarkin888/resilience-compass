import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Dot } from "recharts";
import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

const data = [
  { q: "Q1", v: 62 },
  { q: "Q2", v: 58 },
  { q: "Q3", v: 56 },
  { q: "Q4", v: 54 },
];

const LastDot = (props: any) => {
  const { cx, cy, index } = props;
  if (index !== data.length - 1) return null;
  return <Dot cx={cx} cy={cy} r={5} fill="#B45309" stroke="#fff" strokeWidth={2} />;
};

const LIVE_KRIS = ["sickness_absence", "vacancy"];

export const ScoreCard = () => {
  const [stale, setStale] = useState(false);

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="sm:w-1/3 sm:shrink-0">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-slate-900 leading-none sm:text-6xl">54</span>
              <span className="text-2xl text-slate-500">/100</span>
              {stale && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={0}
                      role="button"
                      aria-describedby="score-stale-tooltip"
                      className="ml-1 inline-flex items-center text-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
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
            <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-sm font-medium text-slate-500">Human Capital Score</span>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-severity-warning ${
                  stale ? "stale-stripes" : "bg-amber-50"
                }`}
              >
                At Risk
              </span>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-4 sm:flex-1 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <p className="text-[13px] italic leading-relaxed text-slate-600 sm:text-[14px] lg:text-[15px]">
              This is an AI-powered resilience dashboard helping NHS Trusts monitor and anticipate workforce risk. This prototype focuses on the Human Capital pillar, presenting a composite score drawn from Key Risk Indicators benchmarked against pre-pandemic NHS performance. Staff Vacancy Rate and Sickness Absence Rate are populated with live public data from NHS England; remaining KRIs are clearly labelled as illustrative demo data. This is a working demonstration intended to invite challenge and iteration, not a finished product.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
