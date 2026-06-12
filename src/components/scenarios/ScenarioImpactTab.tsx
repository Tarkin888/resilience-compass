// Tab 3 — Scenario Impact Visualiser.
// Before/after pillar dials driven by the scenario overlay. Live overlay only.
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useHumanCapitalData } from "@/hooks/useHumanCapitalData";
import { useScenario } from "@/contexts/ScenarioContext";
import { computePillarScores } from "@/lib/pillarScores";
import { colourForScore, luminance } from "@/lib/scoreBand";

const NAVY = "#001D57";

function MiniDial({ score, label, dim = false }: { score: number | null; label: string; dim?: boolean }) {
  const color = colourForScore(score ?? 0);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - pct / 100);
  return (
    <div className={`flex flex-col items-center ${dim ? "opacity-50" : ""}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <svg width="92" height="92" viewBox="0 0 92 92" className="mt-1">
        <circle cx="46" cy="46" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="8" />
        {score != null && (
          <circle
            cx="46"
            cy="46"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 46 46)"
          />
        )}
        <text x="46" y="50" textAnchor="middle" dominantBaseline="middle" fontSize="20" fontWeight="700" fill={color}>
          {score ?? "—"}
        </text>
      </svg>
    </div>
  );
}

function Delta({ delta, score }: { delta: number | null; score: number | null }) {
  if (delta == null || delta === 0 || score == null) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
        — 0
      </span>
    );
  }
  const bg = colourForScore(score);
  const fg = luminance(bg) > 0.45 ? NAVY : "#FFFFFF";
  const positive = delta > 0;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: bg, color: fg }}
    >
      {positive ? "▲" : "▼"} {Math.abs(delta)}
    </span>
  );
}

export const ScenarioImpactTab = ({ onBack }: { onBack: () => void }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const { data } = useHumanCapitalData();
  const { overrides, hasRun } = useScenario();

  const liveValues = useMemo<Record<string, number | null>>(() => {
    const out: Record<string, number | null> = {};
    Object.entries(data.capturesByKri).forEach(([kriId, caps]) => {
      const latest = caps[0];
      out[kriId] = latest ? Number(latest.headline_value) : null;
    });
    return out;
  }, [data]);

  const livePillars = useMemo(() => computePillarScores(liveValues), [liveValues]);
  const scenarioPillars = useMemo(
    () => computePillarScores({ ...liveValues, ...overrides }),
    [liveValues, overrides],
  );

  const dashboardBefore = useMemo(() => {
    const scored = livePillars.filter((p) => p.score != null) as Array<{ score: number }>;
    return scored.length ? Math.round(scored.reduce((a, p) => a + p.score, 0) / scored.length) : null;
  }, [livePillars]);
  const dashboardAfter = useMemo(() => {
    const scored = scenarioPillars.filter((p) => p.score != null) as Array<{ score: number }>;
    return scored.length ? Math.round(scored.reduce((a, p) => a + p.score, 0) / scored.length) : null;
  }, [scenarioPillars]);

  const hasOverlay = hasRun && Object.keys(overrides).length > 0;

  if (!hasOverlay) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Run a scenario on the Scenario Testing tab to see its impact here.
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading impact…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-base font-bold" style={{ color: NAVY }}>
          Scenario Impact
        </h2>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
          Illustrative — does not reflect live data
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {livePillars.map((p) => {
          const after = scenarioPillars.find((s) => s.id === p.id)?.score ?? null;
          const delta = p.score != null && after != null ? after - p.score : null;
          const affected = p.id === "human" && delta != null && delta !== 0;
          return (
            <div
              key={p.id}
              className={`rounded-xl border border-slate-200 bg-white p-4 ${
                p.id === "human" ? "" : "bg-slate-50/40"
              }`}
            >
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: NAVY }}>
                {p.name}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <MiniDial score={p.score} label="Current" dim={p.id !== "human"} />
                <MiniDial score={after} label="Scenario" dim={p.id !== "human"} />
              </div>
              <div className="mt-3 flex justify-center">
                {affected ? <Delta delta={delta} score={after} /> : <Delta delta={0} score={after ?? p.score} />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: NAVY }}>
              Dashboard score (Five Capitals)
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Average of pillar scores using the same flat-hold rollup as the live dashboard.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <MiniDial score={dashboardBefore} label="Current" />
            <MiniDial score={dashboardAfter} label="Scenario" />
            <Delta delta={dashboardBefore != null && dashboardAfter != null ? dashboardAfter - dashboardBefore : null} score={dashboardAfter} />
          </div>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#001D57] hover:bg-slate-50"
        >
          <ChevronLeft size={14} aria-hidden />
          Back to Scenario Testing
        </button>
      </div>
    </div>
  );
};
