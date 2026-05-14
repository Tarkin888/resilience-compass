import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Status, Trend } from "@/lib/calc";
import { PriorityInterventionsCard } from "./PriorityInterventionsCard";
import type {
  KriCapture,
  KriDefinition,
  Source,
  Threshold,
} from "@/hooks/useHumanCapitalData";
import { SEVERITY_STYLES, formatDate, formatDateTime, trendArrow } from "./severity";
import { ThresholdPanel } from "./ThresholdPanel";
import { CapturedEditionsPanel } from "./CapturedEditionsPanel";
import { DataSourceChip } from "@/components/DataSourceChip";

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
  const isFlagged = status !== "OK";
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
              <DataSourceChip
                variant="live"
                payload={{
                  publicationName: source?.publication_name ?? "—",
                  editionLabel: latest?.edition_label ?? "—",
                  capturedAtFormatted: latest?.captured_at ? formatDateTime(latest.captured_at) : "—",
                  url: source?.series_landing_page_url ?? "#",
                }}
              />
            ) : (
              <DataSourceChip variant="illustrative" />
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

          <div className="mt-2 space-y-1 text-sm text-slate-700">
            {narrative.split("\n").map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>

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
          </div>
        )}
      </div>

      {isFlagged && <PriorityInterventionsCard kriId={definition.kri_id} />}

      {threshold && (
        <ThresholdPanel
          threshold={threshold}
          source={source}
          capturedAt={latest?.captured_at}
          editionLabel={latest?.edition_label}
          isLive={definition.is_live}
          onViewEditions={definition.is_live ? () => setEditionsOpen(true) : undefined}
        />
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
