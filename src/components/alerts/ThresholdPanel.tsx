import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Threshold, Source } from "@/hooks/useHumanCapitalData";
import { formatDateTime } from "./severity";

interface Props {
  threshold: Threshold;
  source?: Source;
  capturedAt?: string | null;
  editionLabel?: string | null;
  isLive: boolean;
  onViewEditions?: () => void;
}

export const ThresholdPanel = ({
  threshold,
  source,
  capturedAt,
  editionLabel,
  isLive,
  onViewEditions,
}: Props) => {
  const [open, setOpen] = useState(false);
  const unit = threshold.units === "percent" ? "%" : ` ${threshold.units}`;
  const rationale = (threshold as Threshold & { rationale?: string | null }).rationale;
  const overrideValue = (threshold as Threshold & { trust_override_value?: number | null }).trust_override_value;
  const overrideSource = (threshold as Threshold & { trust_override_source?: string | null }).trust_override_source;
  const overrideAt = (threshold as Threshold & { trust_override_captured_at?: string | null }).trust_override_captured_at;

  return (
    <section className="border-t border-slate-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-slate-900">How this minimum threshold was set</span>
        <ChevronDown
          size={16}
          className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-700">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Minimum threshold value
            </div>
            <div className="mt-1">
              &lt; {threshold.threshold_value}
              {unit}
            </div>
            {threshold.qualifier_label && (
              <div className="mt-1 inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 border border-amber-200">
                {threshold.qualifier_label}
              </div>
            )}
            {threshold.is_official_nhs_target && (
              <div className="mt-1 text-xs text-slate-500">Official NHS target</div>
            )}
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Methodology
            </div>
            <div className="mt-1">{threshold.methodology_label}</div>
            {threshold.methodology_long && (
              <p className="mt-1 text-slate-600">{threshold.methodology_long}</p>
            )}
            {(threshold.methodology_window_start || threshold.methodology_n) && (
              <div className="mt-1 text-xs text-slate-500">
                {threshold.methodology_window_start} – {threshold.methodology_window_end}
                {threshold.methodology_n ? ` · n=${threshold.methodology_n}` : ""}
              </div>
            )}
          </div>

          {rationale && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Rationale
              </div>
              <p className="mt-1 text-base text-slate-700">{rationale}</p>
            </div>
          )}

          <div className="text-xs">
            {overrideValue != null ? (
              <span className="text-slate-700">
                Trust-specific minimum threshold in use: &lt; {overrideValue}
                {unit}
                {overrideSource ? ` (set by ${overrideSource}` : ""}
                {overrideAt ? `, ${formatDateTime(overrideAt)})` : overrideSource ? ")" : ""}
              </span>
            ) : (
              <span className="text-slate-500">
                No trust-specific minimum threshold supplied — using working benchmark.
              </span>
            )}
          </div>

          {source && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Source
              </div>
              <div className="mt-1">
                {source.publication_name}
                {source.kri_id === "sickness_absence" && (
                  <>
                    , <em>Table 1, England column</em>
                  </>
                )}
                {editionLabel ? <span className="text-slate-500"> · {editionLabel}</span> : null}
              </div>
              <div className="text-xs text-slate-500">{source.publisher}</div>
              {capturedAt && (
                <div className="mt-1 text-xs text-slate-500">
                  Captured {formatDateTime(capturedAt)}
                </div>
              )}
            </div>
          )}

          {isLive && onViewEditions && (
            <button
              type="button"
              onClick={onViewEditions}
              className="text-sm font-medium text-brand hover:underline"
            >
              View captured editions →
            </button>
          )}
        </div>
      )}
    </section>
  );
};
