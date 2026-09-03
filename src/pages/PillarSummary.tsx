import { useMemo } from "react";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  const navigate = useNavigate();
  const { id } = useParams();
  const { data, loading } = useHumanCapitalData();

  const liveValues = useMemo<Record<string, number | null>>(() => {
    const out: Record<string, number | null> = {};
    Object.entries(data.capturesByKri).forEach(([kriId, caps]) => {
      const latest = caps[0];
      out[kriId] = latest ? Number(latest.headline_value) : null;
    });
    return out;
  }, [data]);

  const meta = id ? PILLAR_META[id] : undefined;

  const pillar = useMemo(() => {
    const all = computePillarScores(liveValues);
    return all.find((p) => p.id === id) ?? null;
  }, [liveValues, id]);

  if (!pillar) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <p className="text-sm text-slate-600">Pillar not found.</p>
          <Link to="/" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            <ChevronLeft size={16} />
            Back to Five Capitals
          </Link>
        </main>
      </div>
    );
  }

  const isLive = meta?.status === "live";
  const humanLoading = isLive && loading && (liveValues.vacancy == null || liveValues.sickness_absence == null);
  const displayScore = humanLoading ? null : pillar.score;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-brand hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Back to Five Capitals
        </Link>
      </div>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {isLive ? "Live" : "Preview"} · {pillar.name}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-bold tabular-nums" style={{ color: NAVY }}>
                  {displayScore ?? "—"}
                </span>
                <span className="text-sm text-slate-500">/100</span>
                <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {meta?.trendLabel ?? "—"}
                </span>
              </div>
            </div>
            {isLive && (
              <button
                type="button"
                onClick={() => navigate("/human")}
                className="inline-flex items-center gap-1 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Open dashboard
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold" style={{ color: NAVY }}>How to read this view</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li><span className="inline-block h-3 w-3 rounded-full" style={{ background: "#DC2626" }} /> Red (0–35) — below the minimum threshold</li>
              <li><span className="inline-block h-3 w-3 rounded-full" style={{ background: "#F59E0B" }} /> Amber (36–66) — within the operating range</li>
              <li><span className="inline-block h-3 w-3 rounded-full" style={{ background: "#16A34A" }} /> Green (67–100) — at or above target</li>
            </ul>
          </section>

          <div className="mt-4 divide-y divide-slate-100">
            {pillar.indicators.map((ind) => (
              <IndicatorRangeBar key={ind.name} name={ind.name} score={ind.score ?? 0} sublabel={ind.description} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PillarSummary;
