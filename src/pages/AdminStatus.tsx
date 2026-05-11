import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/Footer";
import { BackButton } from "@/components/BackButton";

interface CapRow {
  kri_id: string;
  captured_at: string;
  edition_label: string;
  headline_value: number | null;
}
interface LogRow {
  kri_id: string;
  outcome: string;
  attempt_at: string;
}

const KRI_LIST: { id: string; name: string; unit: string }[] = [
  { id: "sickness_absence", name: "Sickness Absence Rate", unit: "%" },
  { id: "vacancy", name: "Staff Vacancies", unit: "%" },
];

const SUCCESS = new Set(["ok", "success", "no_new_edition"]);

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} at ${time}`;
}

function relative(iso?: string): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function AdminStatus() {
  const [caps, setCaps] = useState<Record<string, CapRow>>({});
  const [logs, setLogs] = useState<Record<string, LogRow>>({});

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("kri_captures")
        .select("kri_id,captured_at,edition_label,headline_value")
        .order("captured_at", { ascending: false });
      const cm: Record<string, CapRow> = {};
      (c ?? []).forEach((r: CapRow) => {
        if (!cm[r.kri_id]) cm[r.kri_id] = r;
      });
      setCaps(cm);

      const { data: l } = await supabase
        .from("capture_log")
        .select("kri_id,outcome,attempt_at")
        .order("attempt_at", { ascending: false });
      const lm: Record<string, LogRow> = {};
      (l ?? []).forEach((r: LogRow) => {
        if (!lm[r.kri_id]) lm[r.kri_id] = r;
      });
      setLogs(lm);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mb-3">
          <BackButton />
        </div>
        <h1 className="text-xl font-bold">Live Data Status</h1>
        <p className="text-sm text-slate-500">
          Operational view of the live NHS data feeds powering this dashboard.
        </p>
      </header>
      <main className="flex-1 px-4 py-6 space-y-5 sm:px-6">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">KRI</th>
                <th className="px-4 py-3">Last attempt</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Last successful capture</th>
                <th className="px-4 py-3">Time since success</th>
                <th className="px-4 py-3">Edition captured</th>
                <th className="px-4 py-3">Headline value</th>
              </tr>
            </thead>
            <tbody>
              {KRI_LIST.map((k) => {
                const log = logs[k.id];
                const cap = caps[k.id];
                const outcome = log?.outcome ?? "unknown";
                const isFail = log && !SUCCESS.has(outcome);
                const chip = !log
                  ? "bg-slate-100 text-slate-600 border-slate-200"
                  : isFail
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200";
                const Icon = !log ? HelpCircle : isFail ? AlertTriangle : CheckCircle2;
                return (
                  <tr
                    key={k.id}
                    className={`border-b border-slate-100 last:border-0 ${
                      isFail ? "bg-amber-50/40" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">{k.name}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtDate(log?.attempt_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${chip}`}
                      >
                        <Icon size={12} aria-hidden />
                        {outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{fmtDate(cap?.captured_at)}</td>
                    <td className="px-4 py-3 text-slate-700">{relative(cap?.captured_at)}</td>
                    <td className="px-4 py-3 text-slate-700">{cap?.edition_label ?? "—"}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-900">
                      {cap?.headline_value != null
                        ? `${cap.headline_value.toFixed(1)}${k.unit}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <section
          aria-labelledby="how-this-page-works"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 id="how-this-page-works" className="text-base font-semibold text-slate-900">
            How this page works.
          </h2>
          <div className="mt-3 space-y-3 text-base leading-relaxed text-slate-700">
            <p>
              This page is the operational view of the live NHS data feeds powering the Human
              Capital dashboard. Each row corresponds to one Key Risk Indicator wired to a public
              NHS data source. The Last attempt column shows the most recent capture attempt,
              regardless of outcome. Outcome is one of captured, no_new_edition, or
              capture_error. Last successful capture shows the timestamp of the most recent
              edition we actually captured into the database; the dashboard headline values and
              edition labels are derived from that capture. Time since success is highlighted
              amber when greater than seven days. Edition captured is the source publication's
              own edition label as parsed from the page; the dashboard's "Last updated" line on
              each KRI card cites this edition verbatim. Headline value is the figure rendered on
              the Tab 1 card.
            </p>
            <p>
              Refresh attempts are triggered by the Refresh button on the Live Risk Alerts tab
              and on a scheduled cadence. A no_new_edition outcome is the normal state between
              publication releases — it is not an error.
            </p>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
