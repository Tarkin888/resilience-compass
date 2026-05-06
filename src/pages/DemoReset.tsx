import { useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FnResult {
  kri: string;
  outcome: string;
  edition?: string;
  ok: boolean;
}

const KRI_LABELS: Record<string, string> = {
  sickness_absence: "Sickness Absence Rate",
  vacancy: "Staff Vacancies",
};

export default function DemoReset() {
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<FnResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const { data, error } = await supabase.functions.invoke("admin_action", {
      body: { action: "verify" },
      headers: { "x-admin-password": password },
    });
    if (error || !(data as { ok?: boolean })?.ok) {
      setAuthError("Incorrect password.");
      return;
    }
    setConfirming(true);
  };

  const runReset = async () => {
    setBusy(true);
    setError(null);
    setResults(null);
    setConfirming(false);
    const { data: r, error: e } = await supabase.functions.invoke("admin_action", {
      body: { action: "reset_demo" },
      headers: { "x-admin-password": password },
    });
    if (e || !(r as { ok?: boolean })?.ok) {
      setBusy(false);
      setError(`Reset failed: ${e?.message ?? (r as { error?: string })?.error ?? "unknown"}`);
      return;
    }
    const [s, v] = await Promise.all([
      supabase.functions.invoke("fetch_nhs_sickness_absence", {
        body: {},
        headers: { "x-admin-password": password },
      }),
      supabase.functions.invoke("fetch_nhs_vacancy", {
        body: {},
        headers: { "x-admin-password": password },
      }),
    ]);
    const summarise = (kri: string, resp: { data: unknown; error: { message: string } | null }): FnResult => {
      if (resp.error) return { kri, outcome: `error: ${resp.error.message}`, ok: false };
      const d = (resp.data ?? {}) as { outcome?: string; edition_label?: string; ok?: boolean };
      const outcome = d.outcome ?? (d.ok ? "success" : "unknown");
      const ok = outcome === "success" || outcome === "ok" || outcome === "no_new_edition";
      return { kri, outcome, edition: d.edition_label, ok };
    };
    setResults([summarise("sickness_absence", s), summarise("vacancy", v)]);
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Demo reset</h1>
        <p className="mt-2 text-sm text-slate-600">
          This deletes all captured editions and capture logs, then re-fetches both live NHS data
          sources. Use only on demo morning.
        </p>

        {!confirming && !results && (
          <form onSubmit={start} className="mt-5 space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              autoComplete="current-password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              autoFocus
            />
            {authError && <p className="text-sm text-red-600">{authError}</p>}
            <button
              type="submit"
              className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Reset and re-capture
            </button>
          </form>
        )}

        {confirming && (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="mt-0.5 text-amber-700" aria-hidden />
              <div className="text-sm text-amber-900">
                This will delete all captured editions and re-fetch from NHS. Continue?
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runReset}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {busy && <p className="mt-5 text-sm text-slate-600">Resetting and re-capturing…</p>}
        {error && <p className="mt-5 text-sm text-red-600">{error}</p>}

        {results && (
          <div className="mt-5 space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">Results</h2>
            <ul className="space-y-2">
              {results.map((r) => (
                <li
                  key={r.kri}
                  className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  {r.ok ? (
                    <CheckCircle2 size={16} className="mt-0.5 text-emerald-600" aria-hidden />
                  ) : (
                    <AlertTriangle size={16} className="mt-0.5 text-amber-600" aria-hidden />
                  )}
                  <div>
                    <div className="font-medium text-slate-900">{KRI_LABELS[r.kri] ?? r.kri}</div>
                    <div className="text-slate-600">
                      {r.outcome}
                      {r.edition ? ` — ${r.edition}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                setResults(null);
                setPassword("");
              }}
              className="mt-2 text-xs text-slate-500 hover:underline"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
