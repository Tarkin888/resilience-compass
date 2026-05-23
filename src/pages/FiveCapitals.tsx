import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PillarDial } from "@/components/capitals/PillarDial";
import { IndicatorRangeBar } from "@/components/capitals/IndicatorRangeBar";

const NAVY = "#001D57";

type Indicator = { name: string; score: number; sublabel: string };

type Pillar = {
  id: "financial" | "operational" | "human" | "reputational" | "environmental";
  name: string;
  score: number;
  trend: "up" | "down" | "flat";
  trendLabel: string;
  status: "live" | "preview";
  indicators: Indicator[];
};

const PILLARS: Pillar[] = [
  {
    id: "financial",
    name: "Financial",
    score: 68,
    trend: "flat",
    trendLabel: "Steady",
    status: "preview",
    indicators: [
      { name: "Liquidity Headroom", score: 72, sublabel: "3 data points · cash reserves, working capital, credit facility" },
      { name: "Cost Base Flexibility", score: 64, sublabel: "4 data points · fixed vs variable, supplier terms, pay mix, agency spend" },
      { name: "Capital Investment Capacity", score: 70, sublabel: "3 data points · CDEL utilisation, backlog maintenance, project pipeline" },
    ],
  },
  {
    id: "operational",
    name: "Operational",
    score: 72,
    trend: "up",
    trendLabel: "Improving",
    status: "preview",
    indicators: [
      { name: "Service Continuity", score: 76, sublabel: "4 data points · downtime, BCP coverage, single points of failure, recovery time" },
      { name: "Supply Chain Resilience", score: 68, sublabel: "3 data points · supplier concentration, stockholding, lead times" },
      { name: "Estate & Asset Reliability", score: 72, sublabel: "3 data points · critical asset age, planned maintenance, incident rate" },
    ],
  },
  {
    id: "human",
    name: "Human (Workforce)",
    score: 54,
    trend: "down",
    trendLabel: "Worsening",
    status: "live",
    indicators: [
      { name: "Workforce of the Future", score: 58, sublabel: "4 data points · headcount vs forecast, talent attraction, talent retention, internal movement" },
      { name: "Job Distribution", score: 62, sublabel: "based on the future skills plan (data points to be confirmed)" },
      { name: "People Resilience", score: 42, sublabel: "5 data points · absence, health & wellbeing, eNPS, engagement, change & innovation" },
      { name: "Continuity of Critical Skills", score: 54, sublabel: "3 data points · role fulfilment, talent attraction, talent attrition" },
    ],
  },
  {
    id: "reputational",
    name: "Reputational",
    score: 81,
    trend: "up",
    trendLabel: "Improving",
    status: "preview",
    indicators: [
      { name: "Stakeholder Trust", score: 84, sublabel: "3 data points · regulator standing, public sentiment, partner relationships" },
      { name: "Brand & Media Position", score: 78, sublabel: "3 data points · share of voice, sentiment trend, crisis exposure" },
      { name: "Patient & Staff Voice", score: 80, sublabel: "3 data points · FFT, complaints, staff survey advocacy" },
    ],
  },
  {
    id: "environmental",
    name: "Environmental",
    score: 45,
    trend: "flat",
    trendLabel: "Steady",
    status: "preview",
    indicators: [
      { name: "Carbon & Energy", score: 48, sublabel: "3 data points · scope 1+2, energy intensity, renewable share" },
      { name: "Climate Adaptation", score: 42, sublabel: "3 data points · flood/heat exposure, adaptation plan, critical site risk" },
      { name: "Resource & Waste", score: 46, sublabel: "3 data points · waste intensity, recycling rate, water use" },
    ],
  },
];

const FiveCapitals = () => {
  const navigate = useNavigate();
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlight, setHighlight] = useState<string | null>(null);

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
        {/* Title */}
        <section>
          <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: NAVY }}>
            Five Capitals Health Score
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            One view of organisational resilience across the five capitals. The Human pillar is live; the other four are illustrative previews.
          </p>
        </section>

        {/* Dials */}
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {PILLARS.map((p) => (
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

        {/* Pillar detail */}
        <section className="mt-8">
          <h2 className="text-lg font-bold" style={{ color: NAVY }}>
            Pillar detail — indicator composition
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {PILLARS.map((p) => {
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
                        <span className="text-2xl font-bold tabular-nums" style={{ color: NAVY }}>
                          {p.score}
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
                    {p.indicators.map((ind) => (
                      <IndicatorRangeBar key={ind.name} {...ind} />
                    ))}
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

        {/* How to read */}
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold" style={{ color: NAVY }}>
            How to read this view
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: "#DC2626" }} />
                <strong>Red (0–24)</strong> — below the minimum threshold; a critical risk, action required.
              </span>
            </li>
            <li>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: "#F59E0B" }} />
                <strong>Amber (25–74)</strong> — within the operating range, below target.
              </span>
            </li>
            <li>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: "#16A34A" }} />
                <strong>Green (75–100)</strong> — at or above target.
              </span>
            </li>
            <li>
              Each data point has a target and a threshold normalised so that <strong>threshold = 25</strong> and <strong>target = 75</strong>. Indicators roll up 3–5 data points.
            </li>
            <li>
              A downward trend arrow means an indicator is moving away from target back towards threshold.
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
