import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { forecastSeries, type ForecastResult, type ForecastPoint } from "@/lib/forecast";
import { useHumanCapitalData } from "@/hooks/useHumanCapitalData";
import { pillarScoreById } from "@/lib/pillarScores";

export interface DashboardForecast extends ForecastResult {
  loading: boolean;
  /** Offset applied to sickness forecast to produce the dashboard rollup
   *  (i.e. sum of the other indicators held flat / carried forward). */
  rollupConstant: number | null;
  /** The live engine-computed Human Capital score used as the forecast
   *  join point — the same value the dashboard displays. */
  currentScore: number | null;
}

/**
 * Dashboard forecast for the Human pillar.
 *
 * Implementation: forecast the sickness_absence KRI (the only series with
 * monthly history long enough to project), then roll up so the forecast
 * joins the LIVE engine-computed Human Capital score (the same value shown
 * everywhere else on the dashboard). Every other scored indicator is held
 * flat across the horizon.
 */
export function useDashboardForecast(): DashboardForecast {
  const [sickness, setSickness] = useState<{ date: string; score: number }[]>([]);
  const [sicknessLoading, setSicknessLoading] = useState(true);
  const { data: hcData, loading: hcLoading } = useHumanCapitalData();

  // Live engine-computed Human Capital score — the canonical "current" value.
  const liveCurrentScore = useMemo<number | null>(() => {
    if (hcLoading) return null;
    const liveValues: Record<string, number | null> = {};
    Object.entries(hcData.capturesByKri).forEach(([kriId, caps]) => {
      const latest = caps[0];
      liveValues[kriId] = latest ? Number(latest.headline_value) : null;
    });
    return pillarScoreById(liveValues, "human");
  }, [hcData, hcLoading]);

  useEffect(() => {
    let cancelled = false;
    setSicknessLoading(true);
    (async () => {
      const { data: sData } = await supabase
        .from("score_history")
        .select("snapshot_date, normalised_score")
        .eq("entity_type", "kri")
        .eq("entity_id", "sickness_absence")
        .order("snapshot_date", { ascending: true });
      if (cancelled) return;
      setSickness(
        (sData ?? []).map((d) => ({
          date: d.snapshot_date as string,
          score: Number(d.normalised_score),
        })),
      );
      setSicknessLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = sicknessLoading || hcLoading;

  return useMemo<DashboardForecast>(() => {
    if (loading || sickness.length === 0 || liveCurrentScore == null) {
      return {
        method: "none",
        points: [],
        caption: "",
        loading,
        rollupConstant: null,
        currentScore: liveCurrentScore,
      };
    }

    const f = forecastSeries({
      scores: sickness.map((s) => s.score),
      dates: sickness.map((s) => s.date),
      cadence: "monthly",
      horizon: 3,
    });

    if (f.method === "none") {
      return { ...f, loading: false, rollupConstant: null, currentScore: liveCurrentScore };
    }

    // Derive rollup constant from the LIVE engine-computed Human Capital score
    // so the forecast joins the value the dashboard actually displays:
    //   live = round((sickness_latest + others) / 5)
    // → others ≈ 5 * live - sickness_latest.
    const latestSickness = sickness[sickness.length - 1].score;
    const PILLAR_KRI_COUNT = 5;
    const others = PILLAR_KRI_COUNT * liveCurrentScore - latestSickness;

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
      currentScore: liveCurrentScore,
    };
  }, [sickness, liveCurrentScore, loading]);
}

function clampRound(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}
