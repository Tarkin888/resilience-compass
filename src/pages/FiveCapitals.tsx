import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PillarDial } from "@/components/capitals/PillarDial";
import { useHumanCapitalData } from "@/hooks/useHumanCapitalData";
import { getLastSuccessfulCapture } from "@/hooks/useLastSuccessfulCapture";
import { formatDateTime } from "@/components/alerts/severity";
import { computePillarScores } from "@/lib/pillarScores";

const NAVY = "#001D57";

const PILLAR_META: Record<string, { trend: "up" | "down" | "flat"; trendLabel: string; status: "live" | "preview" }> = {
  financial: { trend: "down", trendLabel: "Worsening", status: "preview" },
  operational: { trend: "down", trendLabel: "Worsening", status: "preview" },
  human: { trend: "down", trendLabel: "Worsening", status: "live" },
  reputational: { trend: "up", trendLabel: "Improving", status: "preview" },
  environmental: { trend: "up", trendLabel: "Improving", status: "preview" },
};

const FiveCapitals = () => {
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

  const lastSuccessIso = useMemo(() => getLastSuccessfulCapture(data), [data]);
  const lastSuccessIsStale =
    lastSuccessIso != null &&
    Date.now() - new Date(lastSuccessIso).getTime() > 8 * 24 * 60 * 60 * 1000;

  const pillars = useMemo(() => {
    return computePillarScores(liveValues).map((p) => ({ ...p, ...PILLAR_META[p.id] }));
  }, [liveValues]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 text-sm leading-relaxed">
      <Header />

      <div className="border-b border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 sm:px-6">
        <span className="inline-flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${lastSuccessIsStale ? "bg-amber-500" : lastSuccessIso ? "bg-emerald-500" : "bg-slate-300"}`}
          />
          {lastSuccessIso
            ? `Live data feed connected — last successful capture ${formatDateTime(lastSuccessIso)}${lastSuccessIsStale ? " (stale)" : ""}`
            : "Live data feed connected — last successful capture —"}
        </span>
      </div>

      <main className="px-4 py-8 sm:px-6 sm:py-10">
        <section className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold sm:text-3xl">
            <span style={{ color: NAVY }}>Five Capitals Health </span>
            <span style={{ color: "#DC2626" }}>Score</span>
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            One view of organisational resilience across the five capitals. The Human (Workforce) pillar is live; the other four are illustrative previews. Select a pillar to see its indicator composition.
          </p>
        </section>

        <section className="mx-auto mt-8 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {pillars.map((p) => (
            <PillarDial
              key={p.id}
              name={p.name}
              score={p.id === "human" && humanLoading ? null : p.score}
              trend={p.trend}
              trendLabel={p.trendLabel}
              status={p.status}

              onViewDetails={() => navigate(`/pillar/${p.id}`)}
            />
          ))}
        </section>

        <div className="mx-auto mt-8 max-w-6xl text-xs text-slate-500">
          <Link to="/admin/status" className="hover:underline">Live data status</Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FiveCapitals;
