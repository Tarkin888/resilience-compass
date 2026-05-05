import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCw, AlertTriangle, X } from "lucide-react";
import { useHumanCapitalData } from "@/hooks/useHumanCapitalData";
import { buildAlertNarrative, getStatus, getTrend, type Status, type Trend } from "@/lib/calc";
import { AlertCard } from "./AlertCard";
import { SEVERITY_RANK, formatDateTime } from "./severity";

type SeverityFilter = "All" | "Critical" | "Warning" | "Watch";
type SourceFilter = "all" | "live" | "illustrative";

const FAILURE_OUTCOMES = new Set([
  "page_not_found",
  "file_not_found",
  "parse_error",
  "fetch_error",
  "error",
  "failure",
]);

export const LiveRiskAlertsTab = () => {
  const { data, loading, error, refresh } = useHumanCapitalData();
  const [params] = useSearchParams();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("All");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const simulateFailure = params.get("simulateFailure"); // e.g. "vacancy"

  const rows = useMemo(() => {
    return data.definitions.map((def) => {
      const captures = data.capturesByKri[def.kri_id] ?? [];
      const latest = captures[0];
      const threshold = data.thresholdsByKri[def.kri_id];
      const source = data.sourcesByKri[def.kri_id];

      let status: Status;
      let trend: Trend | null = null;
      let value: number | null = null;
      let unit = "percent";
      let narrative = def.description ?? "";

      if (def.is_live && latest && threshold) {
        value = Number(latest.headline_value);
        unit = latest.headline_unit ?? threshold.units;
        status = getStatus(value, Number(threshold.threshold_value));
        if (latest.prior_value != null) {
          trend = getTrend(value, Number(latest.prior_value), true);
        }
        narrative = buildAlertNarrative(
          source?.publication_name ?? "NHS England",
          {
            edition_label: latest.edition_label,
            headline_value: value,
            headline_unit: latest.headline_unit,
            prior_value: latest.prior_value,
          },
          {
            threshold_value: Number(threshold.threshold_value),
            units: threshold.units,
            qualifier_label: threshold.qualifier_label,
          },
          true,
        );
      } else {
        status = (def.illustrative_status as Status) ?? "OK";
        trend = (def.illustrative_trend as Trend) ?? null;
        value = def.illustrative_value != null ? Number(def.illustrative_value) : null;
        const target = def.illustrative_target;
        if (def.kri_id === "staff_engagement_score") unit = "score";
        else unit = "percent";
        const unitSymbol = unit === "percent" ? "%" : ` ${unit}`;
        narrative = `Illustrative reading: ${value?.toFixed(1)}${unitSymbol} against an illustrative target of ${target}${unitSymbol}. Not from a public data source.`;
      }

      return { def, captures, threshold, source, status, trend, value, unit, narrative };
    });
  }, [data]);

  const filtered = useMemo(() => {
    return rows
      .filter((r) => {
        if (severityFilter !== "All" && r.status !== severityFilter) return false;
        if (sourceFilter === "live" && !r.def.is_live) return false;
        if (sourceFilter === "illustrative" && r.def.is_live) return false;
        return true;
      })
      .sort((a, b) => {
        const sa = SEVERITY_RANK[a.status] - SEVERITY_RANK[b.status];
        if (sa !== 0) return sa;
        return a.def.display_order - b.def.display_order;
      });
  }, [rows, severityFilter, sourceFilter]);

  const lastRefreshed = useMemo(() => {
    const liveTimes = rows
      .filter((r) => r.def.is_live)
      .map((r) => r.captures[0]?.captured_at)
      .filter(Boolean) as string[];
    if (liveTimes.length === 0) return null;
    return liveTimes.sort().reverse()[0];
  }, [rows]);

  const failureBanners = useMemo(() => {
    const banners: { kriId: string; displayName: string; lastSuccessAt?: string }[] = [];
    rows.forEach((r) => {
      if (!r.def.is_live) return;
      const log = data.latestLogByKri[r.def.kri_id];
      const dbFailure = log && FAILURE_OUTCOMES.has(log.outcome);
      const simulated = simulateFailure === r.def.kri_id;
      if (dbFailure || simulated) {
        banners.push({
          kriId: r.def.kri_id,
          displayName: r.def.display_name,
          lastSuccessAt: r.captures[0]?.captured_at,
        });
      }
    });
    return banners.filter((b) => !dismissedBanners.has(b.kriId));
  }, [rows, data.latestLogByKri, simulateFailure, dismissedBanners]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const chips: SeverityFilter[] = ["All", "Critical", "Warning", "Watch"];

  return (
    <div className="space-y-4">
      {failureBanners.map((b) => (
        <div
          key={b.kriId}
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
          <div className="flex-1">
            <div className="font-semibold">Live data fetch failed for {b.displayName}.</div>
            <div className="mt-0.5">
              {b.lastSuccessAt
                ? `Showing last successful capture from ${formatDateTime(b.lastSuccessAt)} — value may be out of date.`
                : "No prior successful capture is available."}
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setDismissedBanners((s) => {
                const next = new Set(s);
                next.add(b.kriId);
                return next;
              })
            }
            aria-label="Dismiss"
            className="rounded p-1 hover:bg-amber-100"
          >
            <X size={16} />
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-1" role="group" aria-label="Severity filter">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSeverityFilter(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                severityFilter === c
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-slate-200" />

        <div className="flex items-center gap-1" role="group" aria-label="Source filter">
          {([
            ["all", "All sources"],
            ["live", "Live only"],
            ["illustrative", "Illustrative only"],
          ] as [SourceFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSourceFilter(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                sourceFilter === key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {lastRefreshed
              ? `Last refreshed: ${formatDateTime(lastRefreshed)}`
              : "Last refreshed: —"}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh now
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Failed to load alerts: {error}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading alerts…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No KRIs match the current filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <AlertCard
              key={r.def.id}
              definition={r.def}
              status={r.status}
              trend={r.trend}
              value={r.value}
              unit={r.unit}
              threshold={r.threshold}
              source={r.source}
              captures={r.captures}
              narrative={r.narrative}
            />
          ))}
        </div>
      )}
    </div>
  );
};
