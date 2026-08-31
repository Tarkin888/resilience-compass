import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { IndicatorRangeBar } from "@/components/capitals/IndicatorRangeBar";
import { useHumanCapitalData } from "@/hooks/useHumanCapitalData";
import { computePillarScores } from "@/lib/pillarScores";
import { scoreBandColor } from "@/lib/scoreBand";

const NAVY = "#001D57";

const PILLAR_META: Record<string, { trendLabel: string; status: "live" | "preview" }> = {
  financial: { trendLabel: "Worsening", status: "preview" },
  operational: { trendLabel: "Worsening", status: "preview" },
  human: { trendLabel: "Worsening", status: "live" },
  reputational: { trendLabel: "Improving", status: "preview" },
  environmental: { trendLabel: "Improving", status: "preview" },
};

const PillarSummary = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, loading } = useHumanCapitalData();

  const liveValues = useMemo<Record<string, number | null>>(() => {
    const out: Record<string, number | null> = {};
    Object.entries(data.capturesByKri).forEach(([kriId, caps]) => {
      const latest = caps[0];
      out[kriId] = latest ? Number(latest.headline_value) : null;
    });
    return out;
  }, [data]);

  const humanLoading = loading || liveValues.vacancy == null || liveValues.sickness_absence == null;

  const pillar = useMemo(() => {
    const all = computePillarScores(liveValues);
    const found = all.find((p) => p.id === id);
    if (!found) return null;
    const meta = PILLAR_META[found.id];
    return { ...found, ...meta };
  }, [liveValues, id]);

  if (!pillar) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <p className="text-sm text-slate-600">Pillar not found.</p>
          <Link to="/" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            <ChevronLeft size={16} /> Back to Five Capitals
          </Link>
        </main>
      </div>
    );
  }

  const isLive = pillar.status === "live";
  const displayScore = isLive && humanLoading ? null : pillar.score;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 text-sm leading-relaxed">
      <Header />

      <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-brand hover:bg-slate-50"
          >
            <ChevronLeft size={16} aria-hidden />
            Back to Five Capitals
          </button>
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
            <Link to="/" className="hover:underline">Five Capitals</Link>
            <span className="mx-1.5">›</span>
            <span className="font-semibold text-slate-700">{pillar.name}</span>
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {isLive ? "Semi-live" : "Preview"} · {pillar.name}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-bold tabular-nums" style={{ color: scoreBandColor(displayScore) }}>
                  {displayScore ?? "—"}
                </span>
                <span className="text-sm text-slate-500">/100</span>
                <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {pillar.trendLabel}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Indicator composition for this pillar. Each indicator sits on the 0–100 operating range, with minimum threshold at 25 and target at 75.
              </p>
            </div>
            {isLive ? (
              <button
                type="button"
                onClick={() => navigate("/human")}
                className="inline-flex items-center gap-1 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Open dashboard
                <ArrowRight size={16} aria-hidden />
              </button>
            ) : (
              <span
                className="inline-flex items-center rounded-md border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500"
                title="Full dashboard available for Human (Workforce) only in this build"
              >
                Dashboard — illustrative preview
              </span>
            )}
          </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold" style={{ color: NAVY }}>How to read this view</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li><span className="inline-flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ background: "#DC2626" }} /></span><strong>Red (0–35)</strong> — below the minimum threshold; critical risk.</li>
            <li><span className="inline-flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ background: "#F59E0B" }} /></span></li>
          </ul>
        </section>
        <div className="mt-4 divide-y divide-slate-100">
            {pillar.indicators.map((ind) => {
              const sublabel =
                ind.totalCount === 0
                  ? ind.description
                  : `${ind.scoredCount} of ${ind.totalCount} data points scored · ${ind.description}`;
              if (ind.score == null) {
                return (
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
                        <div className="text-xs text-slate-500">Not yet scored · {sublabel}</div>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <IndicatorRangeBar key={ind.name} name={ind.name} score={ind.score} sublabel={sublabel} />
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold" style={{ color: NAVY }}>How to read this view</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li><span className="inline-flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ background: "#DC2626" }} /><strong>Red (0–35)</strong> — below the minimum threshold; critical risk.</span></li>
            <li><span className="inline-flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ background: "#F59E0B" }} /><strong>Amber (36–66)</strong> — within the operating range, below target.</span></li>
            <li><span className="inline-flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full" style={{ background: "#16A34A" }} /><strong>Green (67–100)</strong> — at or above target.</span></li>
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PillarSummary;
