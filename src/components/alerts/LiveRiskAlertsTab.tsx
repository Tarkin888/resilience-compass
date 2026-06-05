import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { AlertTriangle, X } from "lucide-react";
import { useHumanCapitalData } from "@/hooks/useHumanCapitalData";
import { buildAlertNarrative, getStatus, getTrend, type Status, type Trend } from "@/lib/calc";
import { normaliseScore } from "@/lib/scoringEngine";
import { TAB1_ENGINE_CONFIG } from "@/config/tab1EngineConfig";
import { AlertCard } from "./AlertCard";
import { LiveDataStatusBanner } from "./LiveDataStatusBanner";
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
  "html_parse_failed",
  "file_download_failed",
  "value_extract_failed",
  "simulated_failure",
]);

const BENIGN_OUTCOMES = new Set(["ok", "success", "no_new_edition"]);

// Display-only nesting of data points under their parent indicator
// (Rick's case study pp. 6–8, confirmed in Prompt_12 Change 3).
// Job Distribution has no confirmed data points yet; Training Compliance is
// unassigned until Rick confirms its parent indicator (decision D6 —
// untraceable assumptions must be flagged).
const INDICATOR_GROUPS: { id: string; name: string; kris: string[] }[] = [
  { id: "workforce_of_the_future", name: "Workforce of the Future", kris: ["vacancy"] },
  { id: "people_resilience", name: "People Resilience", kris: ["sickness_absence", "staff_engagement_score"] },
  { id: "continuity_critical_skills", name: "Continuity of Critical Skills", kris: ["voluntary_turnover"] },
  { id: "job_distribution", name: "Job Distribution", kris: [] },
  { id: "unassigned", name: "Unassigned — parent indicator to be confirmed with Rick", kris: ["training_compliance"] },
];

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
      const engineConfig = TAB1_ENGINE_CONFIG[def.kri_id];

      let status: Status;
      let trend: Trend | null = null;
      let value: number | null = null;
      let unit = "percent";
      let narrative = def.description ?? "";
      let engineScore: number | null = null;

      if (def.is_live && latest && threshold) {
        value = Number(latest.headline_value);
        unit = latest.headline_unit ?? threshold.units;
        status = getStatus(value, Number(threshold.threshold_value));
        if (latest.prior_value != null) {
          trend = getTrend(value, Number(latest.prior_value), true);
        }
        const SOURCE_DETAIL: Record<string, string> = {
          sickness_absence: "England (NHS Digital), Table 1, England column",
          vacancy: "England (NHS Digital), Table 1, England column",
        };
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
          SOURCE_DETAIL[def.kri_id] ?? "",
        );

        // Compute engine score from live value
        if (engineConfig) {
          const target = Number(threshold.threshold_value);
          engineScore = normaliseScore(value, target, engineConfig.minimumThreshold);
        }
      } else {
        status = (def.illustrative_status as Status) ?? "OK";
        trend = (def.illustrative_trend as Trend) ?? null;
        value = def.illustrative_value != null ? Number(def.illustrative_value) : null;
        const target = def.illustrative_target;
        if (def.kri_id === "staff_engagement_score") unit = "score";
        else unit = "percent";
        const unitSymbol = unit === "percent" ? "%" : ` ${unit}`;
        narrative = `Illustrative reading: ${value?.toFixed(1)}${unitSymbol} against an illustrative target of ${target}${unitSymbol}. Not from a public data source.`;

        // Compute engine score from illustrative value
        if (engineConfig && value != null && target != null) {
          engineScore = normaliseScore(value, target, engineConfig.minimumThreshold);
        }
      }

      return { def, captures, threshold, source, status, trend, value, unit, narrative, engineScore };
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
      // Public refresh re-reads the latest captured data from the database.
      // Triggering new privileged scrapes is only possible from the admin pages.
      const sources = liveKris;
      console.info("refresh:capture-ok", { sources });

      setLastCheckedAt(new Date());
      setLastCheckSummary("Refreshed from latest captured data");


      await refresh();
      console.info("refresh:rerender");
    } catch (e) {
      console.error("refresh:capture-error", e);
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

        {lastCheckedAt && (
          <span className="text-[11px] text-slate-400 sm:ml-auto">
            Last checked {formatDateTime(lastCheckedAt.toISOString())}
            {lastCheckSummary ? ` — ${lastCheckSummary}` : ""}
          </span>
        )}
      </div>

      <LiveDataStatusBanner
        lastRefreshed={lastRefreshed}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        loading={loading}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Failed to load alerts: {error}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading alerts…
        </div>
      ) : (
        <div className="space-y-6">
          {INDICATOR_GROUPS.map((group) => {
            const groupRowsAll = rows.filter((r) => group.kris.includes(r.def.kri_id));
            const groupRowsVisible = filtered.filter((r) => group.kris.includes(r.def.kri_id));
            const scoredCount = groupRowsAll.filter((r) => r.engineScore != null).length;
            const totalCount = groupRowsAll.length;
            const isJobDist = group.id === "job_distribution";
            const isUnassigned = group.id === "unassigned";

            return (
              <section key={group.id} aria-label={group.name}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-1.5">
                  <h2
                    className={`text-sm font-bold uppercase tracking-wide ${
                      isUnassigned ? "text-amber-700" : "text-[#001D57]"
                    }`}
                  >
                    {group.name}
                  </h2>
                  <span className="text-[11px] font-medium text-slate-500">
                    {isJobDist
                      ? "Not yet scored — data points to be confirmed by Rick"
                      : `${scoredCount} of ${totalCount} data point${totalCount === 1 ? "" : "s"} scored`}
                  </span>
                </div>

                {isJobDist ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                    No data points defined for this indicator yet.
                  </div>
                ) : groupRowsVisible.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-xs text-slate-500">
                    No matching data points under the current filters.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {groupRowsVisible.map((r) => (
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
                        engineScore={r.engineScore}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
