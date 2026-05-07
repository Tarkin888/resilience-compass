import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { RefreshCw, AlertTriangle, X } from "lucide-react";
import { useHumanCapitalData } from "@/hooks/useHumanCapitalData";
import { buildAlertNarrative, getStatus, getTrend, type Status, type Trend } from "@/lib/calc";
import { AlertCard } from "./AlertCard";
import { SEVERITY_RANK, formatDateTime } from "./severity";
import { supabase } from "@/integrations/supabase/client";

type SeverityFilter = "All" | "Critical" | "Warning" | "Watch";
type SourceFilter = "all" | "live" | "illustrative";

const FAILURE_OUTCOMES = new Set([
  "page_not_found",
  "file_not_found",
  "parse_error",
  "fetch_error",
  "error",
  "failure",
  "html_parse_failed",
  "file_download_failed",
  "value_extract_failed",
  "simulated_failure",
]);

const BENIGN_OUTCOMES = new Set(["ok", "success", "no_new_edition"]);

const FAILURE_REASONS: Record<string, string> = {
  page_not_found: "Edition URL pattern did not resolve to a published page",
  html_parse_failed: "Edition page parsed but no data file link was found",
  file_download_failed: "Data file could not be downloaded",
  value_extract_failed: "Data file could not be parsed for the headline value",
  simulated_failure: "Simulated failure toggled on for this source",
  fetch_error: "Source could not be fetched",
  error: "Capture pipeline reported an error",
  failure: "Capture pipeline reported a failure",
  no_new_edition: "No new edition published yet",
};

const FN_MAP: Record<string, string> = {
  vacancy: "fetch_nhs_vacancy",
  sickness_absence: "fetch_nhs_sickness_absence",
};

export const LiveRiskAlertsTab = () => {
  const { data, loading, error, refresh } = useHumanCapitalData();
  const [params] = useSearchParams();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("All");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [lastCheckSummary, setLastCheckSummary] = useState<string>("");

  const simulateFailure = params.get("simulateFailure");

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
    const banners: {
      kriId: string;
      displayName: string;
      sourceLabel: string;
      reason: string;
      lastSuccessAt?: string;
    }[] = [];
    rows.forEach((r) => {
      if (!r.def.is_live) return;
      const log = data.latestLogByKri[r.def.kri_id];
      if (log && BENIGN_OUTCOMES.has(log.outcome)) return;
      const dbFailure = log && FAILURE_OUTCOMES.has(log.outcome);
      const simulated = simulateFailure === r.def.kri_id;
      if (dbFailure || simulated) {
        const outcome = simulated ? "simulated_failure" : (log?.outcome ?? "error");
        banners.push({
          kriId: r.def.kri_id,
          displayName: r.def.display_name,
          sourceLabel: `${r.source?.publication_name ?? "Source"}${r.captures[0]?.edition_label ? ` · ${r.captures[0].edition_label}` : ""}`,
          reason: FAILURE_REASONS[outcome] ?? "Capture failed",
          lastSuccessAt: r.captures[0]?.captured_at,
        });
      }
    });
    return banners.filter((b) => !dismissedBanners.has(b.kriId));
  }, [rows, data.latestLogByKri, simulateFailure, dismissedBanners]);

  const handleRefresh = async () => {
    console.info("refresh:start");
    setRefreshing(true);
    try {
      const liveKris = rows.filter((r) => r.def.is_live).map((r) => r.def.kri_id);
      const results = await Promise.allSettled(
        liveKris.map((kri) => {
          const fn = FN_MAP[kri];
          if (!fn) return Promise.resolve({ data: { skipped: true }, error: null });
          return supabase.functions.invoke(fn, { body: {} });
        }),
      );
      const anyOk = results.some((r) => r.status === "fulfilled");
      if (anyOk) console.info("refresh:capture-ok", results);
      else console.error("refresh:error", results);

      let newCount = 0;
      let noNewCount = 0;
      let hardFailCount = 0;
      results.forEach((res) => {
        if (res.status !== "fulfilled") { hardFailCount++; return; }
        const payload = (res.value as { data?: { outcome?: string; skipped?: boolean } } | undefined)?.data;
        const outcome = payload?.outcome;
        if (payload?.skipped) return;
        if (outcome === "success") newCount++;
        else if (outcome === "no_new_edition") noNewCount++;
        else hardFailCount++;
      });

      let summary = "";
      if (newCount > 0) {
        summary = `${newCount} new edition${newCount === 1 ? "" : "s"} captured`;
      } else if (hardFailCount === 0 && noNewCount > 0) {
        summary = "No new editions available yet";
      }
      setLastCheckedAt(new Date());
      setLastCheckSummary(summary);

      await refresh();
      console.info("refresh:rerender");
    } catch (e) {
      console.error("refresh:error", e);
      setLastCheckedAt(new Date());
      setLastCheckSummary("");
    } finally {
      setRefreshing(false);
    }
  };

  const chips: SeverityFilter[] = ["All", "Critical", "Warning", "Watch"];

  return (
    <div className="space-y-4">
      {failureBanners.map((b) => (
        <div
          key={b.kriId}
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-700" />
          <div className="flex-1">
            <div className="font-semibold">Live data fetch failed for {b.displayName}.</div>
            <div className="mt-0.5 text-red-800">{b.sourceLabel}</div>
            <div className="mt-0.5">{b.reason}.</div>
            <div className="mt-0.5 text-xs text-red-800">
              {b.lastSuccessAt
                ? `Showing last successful capture from ${formatDateTime(b.lastSuccessAt)} — value may be out of date.`
                : "No prior successful capture is available."}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
              >
                Retry now
              </button>
              <Link
                to={`/admin/sources#${b.kriId}`}
                className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-100"
              >
                Open admin
              </Link>
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
            className="rounded p-1 hover:bg-red-100"
          >
            <X size={16} />
          </button>
        </div>
      ))}

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Severity filter">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSeverityFilter(c)}
              aria-pressed={severityFilter === c}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] ${
                severityFilter === c
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="hidden h-5 w-px bg-slate-200 sm:block" />

        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Source filter">
          {([
            ["all", "All sources"],
            ["live", "Live only"],
            ["illustrative", "Illustrative only"],
          ] as [SourceFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSourceFilter(key)}
              aria-pressed={sourceFilter === key}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] ${
                sourceFilter === key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1 sm:ml-auto sm:items-end">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs text-slate-500">
              {lastRefreshed
                ? `Last refreshed: ${formatDateTime(lastRefreshed)}`
                : "Last refreshed: —"}
            </span>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex min-h-[36px] items-center gap-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          {lastCheckedAt && (
            <span className="text-[11px] text-slate-400">
              Last checked {formatDateTime(lastCheckedAt.toISOString())}
              {lastCheckSummary ? ` — ${lastCheckSummary}` : ""}
            </span>
          )}
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
