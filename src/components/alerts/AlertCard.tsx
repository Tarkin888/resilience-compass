import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { Status, Trend } from "@/lib/calc";
import { getInterventions } from "@/lib/interventions";
import type {
  KriCapture,
  KriDefinition,
  Source,
  Threshold,
} from "@/hooks/useHumanCapitalData";
import { SEVERITY_STYLES, formatDate, formatDateTime, trendArrow } from "./severity";
import { ThresholdPanel } from "./ThresholdPanel";
import { CapturedEditionsPanel } from "./CapturedEditionsPanel";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  definition: KriDefinition;
  status: Status;
  trend: Trend | null;
  value: number | null;
  unit: string;
  threshold?: Threshold;
  source?: Source;
  captures?: KriCapture[];
  narrative: string;
}

export const AlertCard = ({
  definition,
  status,
  trend,
  value,
  unit,
  threshold,
  source,
  captures = [],
  narrative,
}: Props) => {
  const [whyOpen, setWhyOpen] = useState(false);
  const [editionsOpen, setEditionsOpen] = useState(false);
  const sev = SEVERITY_STYLES[status];
  const arrow = trend ? trendArrow(trend) : null;
  const interventions = getInterventions(definition.kri_id);
  const latest = captures[0];

  const unitSymbol = unit === "percent" ? "%" : ` ${unit}`;
  const thresholdValue = threshold?.threshold_value ?? definition.illustrative_target;

  return (
    <article
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      aria-label={`${definition.display_name} — ${sev.label}`}
    >
      <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
        <div className="flex flex-col items-center pt-1">
          <span className={`h-3 w-3 rounded-full ${sev.dot}`} aria-hidden />
          <span className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {sev.label}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">{definition.display_name}</h3>
            {definition.is_live ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    aria-label="Live source details"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    Live · Public Data
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-0.5 text-xs">
                    <div><span className="font-semibold">Publication:</span> {source?.publication_name ?? "—"}</div>
                    <div><span className="font-semibold">Edition:</span> {latest?.edition_label ?? "—"}</div>
                    <div><span className="font-semibold">Captured:</span> {latest?.captured_at ? formatDateTime(latest.captured_at) : "—"}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    aria-label="Illustrative data"
                  >
                    Illustrative
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-xs">Demo placeholder — not from a live source</span>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-mono text-2xl font-semibold tabular-nums text-slate-900">
              {value != null ? `${value.toFixed(1)}${unitSymbol}` : "—"}
            </span>
            {thresholdValue != null && (
              <span className="text-sm text-slate-500">
                vs. &lt; {thresholdValue}
                {unitSymbol}
              </span>
            )}
            {arrow && (
              <span className={`inline-flex items-center gap-1 text-sm font-medium ${arrow.className}`}>
                <span aria-hidden className="text-base leading-none">
                  {arrow.symbol}
                </span>
                {arrow.label}
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-slate-700">{narrative}</p>

          {definition.is_live && latest && (
            <p className="mt-1 text-xs text-slate-500">
              Last updated {formatDate(latest.captured_at)} · {latest.edition_label}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200">
        <button
          type="button"
          onClick={() => setWhyOpen((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-3 text-left"
          aria-expanded={whyOpen}
        >
          <span className="text-sm font-semibold text-slate-900">Why this is flagged</span>
          <ChevronDown
            size={16}
            className={`text-slate-500 transition-transform ${whyOpen ? "rotate-180" : ""}`}
          />
        </button>
        {whyOpen && (
          <div className="space-y-3 border-t border-slate-200 px-5 py-4 text-base text-slate-700">
            <p>
              {status === "OK"
                ? `${definition.display_name} is currently within the working threshold.`
                : `${definition.display_name} is sitting in the "${sev.label}" band against its working threshold. ${
                    arrow?.label === "worsening"
                      ? "The trend is worsening compared with the prior reading, which compounds the risk."
                      : arrow?.label === "improving"
                        ? "The trend is improving, but the value remains above the working threshold."
                        : "The reading is steady against the prior period."
                  }`}
            </p>
            {interventions.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Suggested interventions
                </div>
                <ul className="list-disc space-y-1 pl-5">
                  {interventions.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {threshold && (
        <div className="border-t border-slate-200 px-5 py-4">
          <ThresholdPanel
            threshold={threshold}
            source={source}
            capturedAt={latest?.captured_at}
            editionLabel={latest?.edition_label}
            isLive={definition.is_live}
            onViewEditions={definition.is_live ? () => setEditionsOpen(true) : undefined}
          />
        </div>
      )}

      {definition.is_live && (
        <CapturedEditionsPanel
          open={editionsOpen}
          onOpenChange={setEditionsOpen}
          kriId={definition.kri_id}
          displayName={definition.display_name}
          isLive={definition.is_live}
          captures={captures}
          source={source}
        />
      )}
    </article>
  );
};
