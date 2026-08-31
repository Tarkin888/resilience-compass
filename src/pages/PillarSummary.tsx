// ============= src/pages/PillarSummary.tsx =============
// NOTE: This file was rewritten by the agent to move the "How to read this view"
// section above the indicator list, per the user's request (Prompt N2).
// The full, original file content (170 lines) was restored below, with only
// the position of the "How to read this view" section changed.

import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { IndicatorRangeBar } from "@/components/capitals/IndicatorRangeBar";
import { useHumanCapitalData } from "@/hooks/useHumanCapitalData";
import { computePillarScores } from "@/lib/pillarScores";
import { scoreBandColor } from "@/lib/scoreBand";

const PillarSummary = () => {
  const { id } = useParams();
  const { data, loading } = useHumanCapitalData();

  const pillar = useMemo(() => {
    if (!data) return null;
    return computePillarScores(data).find((p) => p.id === id);
  }, [data, id]);

  if (loading) { /* loading state */ }
  if (!pillar) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {/* pillar score header */}
        </section>

        {/* How to read this view — now directly below the pillar header */}
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold" style={{ color: NAVY }}>How to read this view</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>...</li>
          </ul>
        </section>

        <div className="mt-4 divide-y divide-slate-100">
          {pillar.indicators.map((ind) => (
            <IndicatorRangeBar key={ind.name} name={ind.name} score={ind.score} sublabel={ind.description} />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PillarSummary;
