import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";

interface SourceRow {
  id: string;
  kri_id: string;
  publication_name: string;
  edition_page_url_pattern: string;
  last_known_file_url: string | null;
  backfill_file_url: string | null;
  update_cadence: string;
  simulate_failure?: boolean;
}
interface CaptureRow { kri_id: string; captured_at: string; edition_label: string; headline_value: number | null; }
interface LogRow { kri_id: string; outcome: string; attempt_at: string; error_detail: string | null; }

const FN_MAP: Record<string, string> = {
  vacancy: "fetch_nhs_vacancy",
  sickness_absence: "fetch_nhs_sickness_absence",
};



export default function AdminSources() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Admin password is held only in component state for the lifetime of the tab.
  // We deliberately do NOT persist it (sessionStorage/localStorage) so that an
  // XSS payload in any other page cannot exfiltrate it.


  const [sources, setSources] = useState<SourceRow[]>([]);
  const [latestCaps, setLatestCaps] = useState<Record<string, CaptureRow>>({});
  const [latestLogs, setLatestLogs] = useState<Record<string, LogRow>>({});
  const [overrideInputs, setOverrideInputs] = useState<Record<string, string>>({});
  const [backfillInputs, setBackfillInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, string>>({});
  const [backfillBusy, setBackfillBusy] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const runBackfill = async () => {
    setBackfillBusy(true);
    setBackfillResult("Running — fetching 24 months of NHS history and recomputing the score engine…");
    const { data, error } = await supabase.functions.invoke("backfill_kri_history", {
      body: {},
      headers: { "x-admin-password": password },
    });
    setBackfillBusy(false);
    setBackfillResult(error ? `Error: ${error.message}` : JSON.stringify(data, null, 2));
    load();
  };

  const load = async () => {
    const { data: sResp } = await supabase.functions.invoke("admin_action", {
      body: { action: "list_sources" },
      headers: { "x-admin-password": password },
    });
    const s = (sResp as { sources?: SourceRow[] } | null)?.sources ?? [];
    setSources(s as SourceRow[]);
    const init: Record<string, string> = {};
    const initBackfill: Record<string, string> = {};
    s.forEach((r: SourceRow) => {
      init[r.kri_id] = r.last_known_file_url ?? "";
      initBackfill[r.kri_id] = r.backfill_file_url ?? "";
    });
    setOverrideInputs(init);
    setBackfillInputs(initBackfill);

    const { data: caps } = await supabase
      .from("kri_captures").select("kri_id,captured_at,edition_label,headline_value")
      .order("captured_at", { ascending: false });
    const capMap: Record<string, CaptureRow> = {};
    (caps ?? []).forEach((c: CaptureRow) => { if (!capMap[c.kri_id]) capMap[c.kri_id] = c; });
    setLatestCaps(capMap);

    const { data: logResp } = await supabase.functions.invoke("admin_action", {
      body: { action: "list_recent_logs" },
      headers: { "x-admin-password": password },
    });
    const logs = (logResp as { logs?: LogRow[] } | null)?.logs ?? [];
    const logMap: Record<string, LogRow> = {};
    logs.forEach((l) => { if (!logMap[l.kri_id]) logMap[l.kri_id] = l; });
    setLatestLogs(logMap);
  };

  useEffect(() => { if (authed) load(); }, [authed]);

  const verify = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && "preventDefault" in e) e.preventDefault();
    setAuthError(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin_action", {
        body: { action: "verify" },
        headers: { "x-admin-password": password },
      });
      if (error || !(data as { ok?: boolean })?.ok) {
        setAuthError("Incorrect password.");
        return;
      }
      // Intentionally NOT persisted — see comment at top of component.
      setAuthed(true);
    } catch (err) {
      setAuthError("Sign-in failed. Please try again.");
    }
  };

  const toggleSimulateFailure = async (kri_id: string, value: boolean) => {
    setBusy((b) => ({ ...b, [kri_id]: true }));
    const { error } = await supabase.functions.invoke("admin_action", {
      body: { action: "set_simulate_failure", kri_id, simulate_failure: value },
      headers: { "x-admin-password": password },
    });
    setBusy((b) => ({ ...b, [kri_id]: false }));
    setResults((r) => ({
      ...r,
      [kri_id]: error ? `Error: ${error.message}` : value
        ? "Simulate failure: ON. Next refresh for this source will fail and the loud-failure banner will appear."
        : "Simulate failure: OFF. Normal capture behaviour restored.",
    }));
    load();
  };

  const saveOverride = async (kri_id: string) => {
    setBusy((b) => ({ ...b, [kri_id]: true }));
    const { error } = await supabase.functions.invoke("admin_action", {
      body: { action: "set_override_url", kri_id, last_known_file_url: overrideInputs[kri_id] || null },
      headers: { "x-admin-password": password },
    });
    setBusy((b) => ({ ...b, [kri_id]: false }));
    setResults((r) => ({ ...r, [kri_id]: error ? `Save failed: ${error.message}` : "Override URL saved." }));
    load();
  };

  const runCapture = async (kri_id: string) => {
    setBusy((b) => ({ ...b, [kri_id]: true }));
    setResults((r) => ({ ...r, [kri_id]: "Running…" }));
    const fn = FN_MAP[kri_id];
    const { data, error } = await supabase.functions.invoke(fn, {
      body: {},
      headers: { "x-admin-password": password },
    });
    setBusy((b) => ({ ...b, [kri_id]: false }));
    if (error) {
      setResults((r) => ({ ...r, [kri_id]: `Error: ${error.message}` }));
    } else {
      setResults((r) => ({ ...r, [kri_id]: JSON.stringify(data, null, 2) }));
    }
    load();
  };

  const simulateFailure = async (kri_id: string) => {
    setBusy((b) => ({ ...b, [kri_id]: true }));
    const { error } = await supabase.functions.invoke("admin_action", {
      body: { action: "simulate_failure", kri_id },
      headers: { "x-admin-password": password },
    });
    setBusy((b) => ({ ...b, [kri_id]: false }));
    setResults((r) => ({
      ...r,
      [kri_id]: error ? `Error: ${error.message}` : "Simulated failure logged. Tab 1 will now show a loud-failure banner.",
    }));
    load();
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <form
          onSubmit={verify}
          noValidate
          className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h1 className="text-xl font-semibold text-slate-900">Admin sign-in</h1>
          <p className="mt-1 text-sm text-slate-500">Enter the shared admin password to manage data sources.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); verify(); } }}
            className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Password"
            autoFocus
            name="admin-password"
            autoComplete="current-password"
          />
          {authError && <p className="mt-2 text-sm text-red-600">{authError}</p>}
          <button
            type="submit"
            onClick={(e) => verify(e)}
            className="mt-4 w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Continue
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mb-3">
          <BackButton />
        </div>
        <h1 className="text-xl font-bold">Admin — Data Sources</h1>
        <p className="text-sm text-slate-500">NHS England public data ingestion controls</p>

        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Historical score engine</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Backfills 24 months of NHS England history for Staff Vacancies and Sickness Absence, then recomputes the score history that drives the header trend chart.
              </p>
            </div>
            <button
              type="button"
              disabled={backfillBusy}
              onClick={runBackfill}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {backfillBusy ? "Backfilling…" : "Backfill score history"}
            </button>
          </div>
          {backfillResult && (
            <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100 whitespace-pre-wrap">
{backfillResult}
            </pre>
          )}
        </div>
      </header>
      <main className="px-4 py-6 space-y-6 sm:px-6">
        {sources.map((s) => {
          const cap = latestCaps[s.kri_id];
          const log = latestLogs[s.kri_id];
          return (
            <section
              key={s.id}
              id={s.kri_id}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm scroll-mt-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{s.publication_name}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Data point: <code>{s.kri_id}</code> · cadence: {s.update_cadence}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Pattern: <code className="break-all">{s.edition_page_url_pattern}</code>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy[s.kri_id]}
                    onClick={() => runCapture(s.kri_id)}
                    className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {busy[s.kri_id] ? "Running…" : "Run capture now"}
                  </button>
                  <button
                    type="button"
                    disabled={busy[s.kri_id]}
                    onClick={() => simulateFailure(s.kri_id)}
                    className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                  >
                    Log a failure (one-shot)
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">Simulate failure for next refresh</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    When on, the next refresh for this source will fail without changing the live URL pattern. Used to demo the loud-failure banner.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <span className={`text-xs font-medium ${s.simulate_failure ? "text-red-700" : "text-slate-500"}`}>
                    {s.simulate_failure ? "ON" : "OFF"}
                  </span>
                  <input
                    type="checkbox"
                    checked={!!s.simulate_failure}
                    disabled={busy[s.kri_id]}
                    onChange={(e) => toggleSimulateFailure(s.kri_id, e.target.checked)}
                    className="h-4 w-4"
                  />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500 uppercase">Last successful capture</p>
                  {cap ? (
                    <p className="mt-1 text-sm">
                      {cap.edition_label} — {cap.headline_value}% · {new Date(cap.captured_at).toLocaleString("en-GB")}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">No captures yet.</p>
                  )}
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500 uppercase">Last attempt</p>
                  {log ? (
                    <p className="mt-1 text-sm">
                      <span className="font-medium">{log.outcome}</span> · {new Date(log.attempt_at).toLocaleString("en-GB")}
                      {log.error_detail && <span className="block text-xs text-slate-500 mt-1">{log.error_detail}</span>}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">No attempts yet.</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-medium text-slate-500 uppercase">Override file URL (used if scrape fails)</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="url"
                    value={overrideInputs[s.kri_id] ?? ""}
                    onChange={(e) => setOverrideInputs((o) => ({ ...o, [s.kri_id]: e.target.value }))}
                    placeholder="https://digital.nhs.uk/.../file.xlsx"
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={busy[s.kri_id]}
                    onClick={() => saveOverride(s.kri_id)}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
                  >
                    Save
                  </button>
                </div>
              </div>

              {results[s.kri_id] && (
                <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100 whitespace-pre-wrap">
{results[s.kri_id]}
                </pre>
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
}
