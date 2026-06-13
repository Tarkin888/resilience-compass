import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PillarDial } from "@/components/capitals/PillarDial";
import { IndicatorRangeBar } from "@/components/capitals/IndicatorRangeBar";
import { useHumanCapitalData } from "@/hooks/useHumanCapitalData";
import { computePillarScores } from "@/lib/pillarScores";
import { scoreBandColor } from "@/lib/scoreBand";

const NAVY = "#001D57";

// Trend chips and live/preview status remain hand-set; a historical engine is out
// of scope for this prompt (OQ-14 Option B).
const PILLAR_META: Record<string, { trend: "up" | "down" | "flat"; trendLabel: string; status: "live" | "preview" }> = {
  financial: { trend: "down", trendLabel: "Worsening", status: "preview" },
  operational: { trend: "down", trendLabel: "Worsening", status: "preview" },
  human: { trend: "down", trendLabel: "Worsening", status: "live" },
  reputational: { trend: "up", trendLabel: "Improving", status: "preview" },
  environmental: { trend: "up", trendLabel: "Improving", status: "preview" },
};

const FiveCapitals = () => {
  const navigate = useNavigate();
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlight, setHighlight] = useState<string | null>(null);
  const { data } = useHumanCapitalData();

  // Latest live values keyed by kri_id.
  const liveValues = useMemo<Record<string, number | null>>(() => {
    const out: Record<string, number | null> = {};
    Object.entries(data.capturesByKri).forEach(([kriId, caps]) => {
      const latest = caps[0];
      out[kriId] = latest ? Number(latest.headline_value) : null;
    });
    return out;
  }, [data]);

  const pillars = useMemo(() => {
    return computePillarScores(liveValues).map((p) => {
      const meta = PILLAR_META[p.id];
      const indicators = p.indicators.map((ind) => {
        const sublabel =
          ind.totalCount === 0
            ? ind.description
            : `${ind.scoredCount} of ${ind.totalCount} data points scored · ${ind.description}`;
        return { name: ind.name, score: ind.score, sublabel };
      });
      return { ...p, ...meta, indicators };
    });
  }, [liveValues]);

  const scrollToPillar = (id: string) => {
    const el = cardRefs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlight(id);
    window.setTimeout(() => setHighlight((h) => (h === id ? null : h)), 1600);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 text-sm leading-relaxed">
      <Header />

      {/* Live feed bar */}
      <div className="border-b border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 sm:px-6">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Live data feed connected — last sync 23 May 2026
        </span>
      </div>

      <main className="px-4 py-6 sm:px-6">
        <section>
          <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: NAVY }}>
            Five Capitals Health Score
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            One view of organisational resilience across the five capitals. The Human pillar is live; the other four are illustrative previews.
          </p>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {pillars.map((p) => (
            <PillarDial
              key={p.id}
              name={p.name}
              score={p.score}
              trend={p.trend}
              trendLabel={p.trendLabel}
              onViewDetails={() => scrollToPillar(p.id)}
            />
          ))}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold" style={{ color: NAVY }}>
            Pillar detail — indicator composition
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {pillars.map((p) => {
              const isLive = p.status === "live";
              const isHighlighted = highlight === p.id;
              return (
                <div
                  key={p.id}
                  ref={(el) => (cardRefs.current[p.id] = el)}
                  className={`rounded-xl border bg-white p-5 shadow-sm transition-shadow ${
                    isHighlighted ? "ring-2 ring-[#24BEAA] shadow-md" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {isLive ? "Live build 3 of 5" : "Preview"} · {p.name}
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-bold tabular-nums" style={{ color: scoreBandColor(p.score) }}>
                          {p.score ?? "—"}
                        </span>
                        <span className="text-xs text-slate-500">/100</span>
                        <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          {p.trendLabel}
                        </span>
                      </div>
                    </div>
                    {!isLive && (
                      <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        Illustrative data
                      </span>
                    )}
                  </div>

                  <div className="mt-3 divide-y divide-slate-100">
                    {p.indicators.map((ind) =>
                      ind.score == null ? (
                        <div key={ind.name} className="py-3">
                          <div className="flex items-start gap-3">
                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-[10px] font-semibold text-slate-400"
                              aria-hidden
                            >
                              n/a
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-bold" style={{ color: NAVY }}>
                                {ind.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                Not yet scored · {ind.sublabel}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <IndicatorRangeBar
                          key={ind.name}
                          name={ind.name}
                          score={ind.score}
                          sublabel={ind.sublabel}
                        />
                      ),
                    )}
                  </div>

                  <div className="mt-4">
                    {isLive ? (
                      <button
                        type="button"
                        onClick={() => navigate("/human")}
                        className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        Open dashboard
                        <ArrowRight size={14} aria-hidden />
                      </button>
                    ) : (
                      <span className="inline-flex items-center rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                        Coming soon
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold" style={{ color: NAVY }}>
            How to read this view
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: "#DC2626" }} />
                <strong>Red (0–35)</strong> — below the minimum threshold; a critical risk, action required.
              </span>
            </li>
            <li>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: "#F59E0B" }} />
                <strong>Amber (36–66)</strong> — within the operating range, below target.
              </span>
            </li>
            <li>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: "#16A34A" }} />
                <strong>Green (67–100)</strong> — at or above target.
              </span>
            </li>
            <li>
              Each data point sits on the 0–100 operating range, normalised so that <strong>minimum threshold = 25</strong> and <strong>target = 75</strong>. Indicator scores are the unweighted average of their data-point scores.
            </li>
            <li>
              A downward trend arrow means a score is moving away from target back towards the minimum threshold.
            </li>
          </ul>
        </section>

        <div className="mt-6 text-xs text-slate-500">
          <Link to="/admin/status" className="hover:underline">Live data status</Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FiveCapitals;
