import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { formatDateTime } from "./severity";

interface Props {
  lastRefreshed: string | null;
  onRefresh: () => void;
  refreshing: boolean;
  loading: boolean;
}

export const LiveDataStatusBanner = ({ lastRefreshed, onRefresh, refreshing, loading }: Props) => {
  const ageDays = lastRefreshed
    ? (Date.now() - new Date(lastRefreshed).getTime()) / (1000 * 60 * 60 * 24)
    : null;
  const isFresh = ageDays != null && ageDays <= 7;
  const pillClass = isFresh
    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
    : "bg-amber-100 text-amber-800 border-amber-200";
  const pillLabel = lastRefreshed ? (isFresh ? "Up to date" : "Stale") : "No data";

  return (
    <section
      aria-label="Live data status"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">Live data status</h2>
          <p className="mt-1 text-sm text-slate-700">
            Last successful capture:{" "}
            <span className="font-medium text-slate-900">
              {lastRefreshed ? formatDateTime(lastRefreshed) : "—"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${pillClass}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isFresh ? "bg-emerald-600" : "bg-amber-600"}`} />
            {pillLabel}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing || loading}
            aria-busy={refreshing}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} aria-hidden />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <Link
            to="/admin/status"
            className="text-sm font-medium text-brand hover:underline"
          >
            View capture log →
          </Link>
        </div>
      </div>
    </section>
  );
};
