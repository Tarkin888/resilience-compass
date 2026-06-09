import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { forecastSeries, type ForecastResult, type ForecastPoint } from "@/lib/forecast";

export interface DashboardForecast extends ForecastResult {
  loading: boolean;
  /** Offset applied to sickness forecast to produce the dashboard rollup
   *  (i.e. sum of the other indicators held flat / carried forward). */
  rollupConstant: number | null;
}

/**
 * Dashboard forecast for the Human pillar.
 *
 * Implementation: forecast the sickness_absence KRI (the only series with
 * monthly history long enough to project), then roll up using the Draft 1
 * flat-hold method — every other scored indicator is held at its latest
 * historical value across the horizon (vacancy LOCF between quarters,
 * illustrative indicators flat). The rollup constant is derived from the
 * latest historical snapshots so the forecast joins the latest actual
 * dashboard score exactly.
 */
export function useDashboardForecast(): DashboardForecast {
  const [sickness, setSickness] = useState<{ date: string; score: number }[]>([]);
  const [latestDashboard, setLatestDashboard] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [{ data: sData }, { data: dData }] = await Promise.all([
        supabase
          .from("score_history")
          .select("snapshot_date, normalised_score")
          .eq("entity_type", "kri")
          .eq("entity_id", "sickness_absence")
          .order("snapshot_date", { ascending: true }),
        supabase
          .from("score_history")
          .select("snapshot_date, normalised_score")
          .eq("entity_type", "dashboard")
          .eq("entity_id", "dashboard")
          .order("snapshot_date", { ascending: false })
          .limit(1),
      ]);
      if (cancelled) return;
      setSickness(
        (sData ?? []).map((d) => ({
          date: d.snapshot_date as string,
          score: Number(d.normalised_score),
        })),
      );
      setLatestDashboard(
        dData && dData.length > 0 ? Number(dData[0].normalised_score) : null,
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo<DashboardForecast>(() => {
    if (loading || sickness.length === 0 || latestDashboard == null) {
      return {
        method: "none",
        points: [],
        caption: "",
        loading,
        rollupConstant: null,
      };
    }

    const f = forecastSeries({
      scores: sickness.map((s) => s.score),
      dates: sickness.map((s) => s.date),
      cadence: "monthly",
      horizon: 3,
    });

    if (f.method === "none") {
      return { ...f, loading: false, rollupConstant: null };
    }

    // Derive rollup constant from the latest historical join point:
    //   dashboard_latest = round((sickness_latest + others) / 5)
    // so others ≈ 5 * dashboard_latest - sickness_latest. Using this offset
    // guarantees the first forecast point reconciles to the latest actual.
    const latestSickness = sickness[sickness.length - 1].score;
    const PILLAR_KRI_COUNT = 5;
    const others = PILLAR_KRI_COUNT * latestDashboard - latestSickness;

    const rolled: ForecastPoint[] = f.points.map((p) => ({
      date: p.date,
      value: clampRound((p.value + others) / PILLAR_KRI_COUNT),
      lower: clampRound((p.lower + others) / PILLAR_KRI_COUNT),
      upper: clampRound((p.upper + others) / PILLAR_KRI_COUNT),
    }));

    return {
      method: f.method,
      points: rolled,
      caption: f.caption,
      loading: false,
      rollupConstant: others,
    };
  }, [sickness, latestDashboard, loading]);
}

function clampRound(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}
