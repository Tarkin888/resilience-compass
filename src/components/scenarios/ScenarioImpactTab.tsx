// Tab — Scenario Impact.
// Shows within-pillar before/after (existing), plus Prompt 27 additions:
//  (A) Cross-pillar cascade — AI-indicative knock-on across the other four capitals.
//  (B) Recover the scores — tiered L1–L3 interventions targeting the post-scenario position.
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, RefreshCw } from "lucide-react";
import { useHumanCapitalData } from "@/hooks/useHumanCapitalData";
import { useScenario } from "@/contexts/ScenarioContext";
import { computePillarScores } from "@/lib/pillarScores";
import { colourForScore, luminance, scoreBandColor } from "@/lib/scoreBand";
import { ScenarioAppliedBanner } from "./ScenarioAppliedBanner";
import { SCENARIOS } from "./scenarios";
import { useCascade, type OtherCapital } from "@/hooks/useCascade";
import { useAIInterventions, type DataPointInfo } from "@/hooks/useAIInterventions";
import { PILLAR_CONFIG, resolveDataPoints } from "@/config/dataPoints";
import { bandFor } from "@/lib/scoringEngine";

const NAVY = "#001D57";

const TIER_META: Record<1 | 2 | 3, { label: string; badgeClass: string }> = {
  1: { label: "Level 1 — No regret", badgeClass: "bg-green-100 text-green-800 border-green-300" },
  2: { label: "Level 2 — Committed effort", badgeClass: "bg-amber-100 text-amber-800 border-amber-300" },
  3: { label: "Level 3 — Last resort", badgeClass: "bg-red-100 text-red-800 border-red-300" },
};

function clamp0100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

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

function ScoreChip({ score }: { score: number | null }) {
  const color = scoreBandColor(score);
  return (
    <span
      className="inline-flex min-w-[2.25rem] items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      {score ?? "—"}
    </span>
  );
}

export const ScenarioImpactTab = ({ onBack }: { onBack: () => void }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const [openRationaleId, setOpenRationaleId] = useState<string | null>(null);

  const { data } = useHumanCapitalData();
  const { overrides, hasRun, selectedScenario } = useScenario();

  const liveValues = useMemo<Record<string, number | null>>(() => {
    const out: Record<string, number | null> = {};
    Object.entries(data.capturesByKri).forEach(([kriId, caps]) => {
      const latest = caps[0];
      out[kriId] = latest ? Number(latest.headline_value) : null;
    });
    return out;
  }, [data]);

  const livePillars = useMemo(() => computePillarScores(liveValues), [liveValues]);
  const scenarioValues = useMemo(() => ({ ...liveValues, ...overrides }), [liveValues, overrides]);
  const scenarioPillars = useMemo(() => computePillarScores(scenarioValues), [scenarioValues]);

  const dashboardBefore = useMemo(() => {
    const scored = livePillars.filter((p) => p.score != null) as Array<{ score: number }>;
    return scored.length ? Math.round(scored.reduce((a, p) => a + p.score, 0) / scored.length) : null;
  }, [livePillars]);

  const hasOverlay = hasRun && Object.keys(overrides).length > 0;

  // Human score before/after — used to size the cascade and seed recovery.
  const humanBefore = livePillars.find((p) => p.id === "human")?.score ?? null;
  const humanAfter = scenarioPillars.find((p) => p.id === "human")?.score ?? null;
  const primaryDelta = humanBefore != null && humanAfter != null ? humanAfter - humanBefore : null;

  const otherCapitals: OtherCapital[] = useMemo(
    () =>
      livePillars
        .filter((p) => p.id !== "human")
        .map((p) => ({ id: p.id as OtherCapital["id"], name: p.name, score: p.score })),
    [livePillars],
  );

  // Resolve the scenario metadata (title/type) — try the selected preset first,
  // else fall back to a synthetic "Custom" scenario keyed by overrides hash.
  const activeScenario = useMemo(() => {
    if (selectedScenario?.id) return SCENARIOS.find((s) => s.id === selectedScenario.id) ?? null;
    return null;
  }, [selectedScenario]);
  const customKey = useMemo(() => {
    if (activeScenario) return null;
    const entries = Object.entries(overrides).sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([k, v]) => `${k}=${v}`).join("|");
  }, [activeScenario, overrides]);

  const cascade = useCascade({
    scenario: activeScenario,
    customKey,
    currentHumanScore: humanBefore,
    projectedHumanScore: humanAfter,
    otherCapitals,
    primaryDelta,
    enabled: hasOverlay,
  });

  // Display "after" per pillar: Human uses the deterministic scenario engine;
  // the other four capitals use the AI-indicative cascade delta (unchanged
  // until cascade items arrive).
  const displayAfterFor = (pillarId: string, before: number | null): number | null => {
    if (pillarId === "human") return scenarioPillars.find((s) => s.id === "human")?.score ?? null;
    if (before == null) return null;
    const item = cascade.items.find((i) => i.pillarId === pillarId);
    return item ? clamp0100(before + item.delta) : before;
  };

  const dashboardAfter = useMemo(() => {
    const afters = livePillars
      .map((p) => displayAfterFor(p.id, p.score))
      .filter((s): s is number => s != null);
    return afters.length
      ? Math.round(afters.reduce((a, s) => a + s, 0) / afters.length)
      : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePillars, scenarioPillars, cascade.items]);

  // Post-scenario data points (projected values) feed the recovery interventions.
  const projectedDataPoints = useMemo<DataPointInfo[]>(() => {
    const human = PILLAR_CONFIG.find((p) => p.id === "human");
    if (!human) return [];
    const list: DataPointInfo[] = [];
    for (const ind of human.indicators) {
      for (const dp of resolveDataPoints(ind, scenarioValues)) {
        if (dp.value == null) continue;
        list.push({
          id: dp.id,
          name: dp.name,
          currentValue: Number(dp.value),
          target: dp.target,
          minimumThreshold: dp.minimumThreshold,
          unit: dp.unit,
          direction: dp.direction,
        });
      }
    }
    return list;
  }, [scenarioValues]);

  const projectedRagBand = humanAfter != null ? bandFor(humanAfter).name : null;
  const {
    interventions,
    loading: interventionsLoading,
    error: interventionsError,
  } = useAIInterventions({
    score: humanAfter,
    ragBand: projectedRagBand,
    dataPoints: hasOverlay ? projectedDataPoints : undefined,
  });

  const orderedInterventions = useMemo(
    () =>
      [...interventions].sort((a, b) => {
        if (a.tier !== b.tier) return a.tier - b.tier;
        return 0;
      }),
    [interventions],
  );

  if (!hasOverlay) {
    return (
      <div className="space-y-4">
        <ScenarioAppliedBanner />
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Change a value or pick a preset on the Scenario Testing tab to see its impact here.
        </div>
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
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#001D57] hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ChevronLeft size={14} aria-hidden="true" />
          Back to Scenario Testing
        </button>
      )}
      <ScenarioAppliedBanner />

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
          const isHuman = p.id === "human";
          const after = displayAfterFor(p.id, p.score);
          const delta = p.score != null && after != null ? after - p.score : null;
          const cascadePending = !isHuman && cascade.loading && cascade.items.length === 0;
          const affected = delta != null && delta !== 0;
          return (
            <div
              key={p.id}
              className={`rounded-xl border border-slate-200 bg-white p-4 ${
                isHuman ? "" : "bg-slate-50/40"
              }`}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: NAVY }}>
                  {p.name}
                </div>
                {!isHuman && (
                  <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-indigo-700">
                    AI-indicative
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <MiniDial score={p.score} label="Current" dim={!isHuman} />
                <MiniDial score={after} label="Scenario" dim={!isHuman} />
              </div>
              <div className="mt-3 flex justify-center">
                {cascadePending ? (
                  <span className="text-[11px] italic text-slate-400">Estimating…</span>
                ) : affected ? (
                  <Delta delta={delta} score={after} />
                ) : (
                  <Delta delta={0} score={after ?? p.score} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* --------- (A) Cross-pillar cascade --------- */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold" style={{ color: NAVY }}>
                Cross-pillar cascade
              </h3>
              <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                AI-indicative
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              How this workforce scenario could knock on to the other four capitals — an indication, refined per client.
            </p>
          </div>
          <button
            type="button"
            onClick={cascade.refresh}
            disabled={cascade.loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={12} className={cascade.loading ? "animate-spin" : ""} aria-hidden />
            Refresh
          </button>
        </div>

        {/* Primary workforce pillar for context */}
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Primary
            </span>
            <span className="text-sm font-semibold text-slate-900">Human (Workforce)</span>
            <ScoreChip score={humanBefore} />
            <span className="text-slate-400" aria-hidden>→</span>
            <ScoreChip score={humanAfter} />
            <Delta delta={primaryDelta} score={humanAfter} />
          </div>
        </div>

        {cascade.loading && cascade.items.length === 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
            ))}
          </div>
        ) : cascade.items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">Cascade unavailable.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {otherCapitals.map((c) => {
              const item = cascade.items.find((i) => i.pillarId === c.id);
              const before = c.score;
              const after = item != null && before != null ? clamp0100(before + item.delta) : before;
              const delta = item?.delta ?? 0;
              return (
                <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: NAVY }}>
                    {c.name}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <ScoreChip score={before} />
                    <span className="text-slate-400" aria-hidden>→</span>
                    <ScoreChip score={after} />
                    <Delta delta={delta} score={after} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {item?.rationale ?? "No cascade estimate available."}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {cascade.source === "fallback" && cascade.items.length > 0 && (
          <p className="mt-3 text-[11px] italic text-slate-500">
            Showing indicative estimates — live model unavailable.
          </p>
        )}
        <p className="mt-2 text-[11px] italic text-slate-500">
          Cross-pillar effects are AI-indicative — knock-on correlations are refined with client-specific data.
        </p>
      </section>

      {/* --------- (B) Recover the scores --------- */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold" style={{ color: NAVY }}>
            Recover the scores
          </h3>
          <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
            AI-indicative
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Given this scenario outcome, the interventions that would most improve the scores.
        </p>

        {interventionsLoading ? (
          <ul className="mt-4 space-y-3" aria-label="Loading recommendations">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200" />
                <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-slate-200" />
              </li>
            ))}
          </ul>
        ) : interventionsError || orderedInterventions.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            Recovery recommendations unavailable — try again shortly.
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {orderedInterventions.map((i, idx) => {
              const meta = TIER_META[i.tier];
              const isOpen = openRationaleId === i.id;
              return (
                <li key={i.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{i.title}</span>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">{i.description}</p>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Time to impact: {i.timeToImpact}
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenRationaleId(isOpen ? null : i.id)}
                        aria-expanded={isOpen}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900"
                      >
                        Why this level
                        <ChevronDown size={12} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <p className="mt-1 rounded-md bg-slate-50 p-2 text-xs leading-relaxed text-slate-700">
                          {i.tierRationale}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: NAVY }}>
              Dashboard score (Five Capitals)
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Average of the pillar scenario scores above — deterministic for Human, AI-indicative for the other four capitals.
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
