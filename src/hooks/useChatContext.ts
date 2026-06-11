import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHumanCapitalData } from "@/hooks/useHumanCapitalData";
import { useScoreHistory } from "@/hooks/useScoreHistory";
import { useDashboardForecast } from "@/hooks/useDashboardForecast";
import { classifyTrend } from "@/lib/spc";
import { bandFor } from "@/lib/scoringEngine";

export type ChatKRI = {
  name: string;
  value: number;
  unit: string;
  score: number;
  ragBand: string;
  target: number | null;
  minThreshold: number | null;
  trend: string;
};

export type ChatContext = {
  pillarName: string;
  pillarScore: number | null;
  ragBand: string | null;
  trend: string;
  kris: ChatKRI[];
  forecast: { available: boolean; direction: string; periods: number; horizon: string } | null;
  dataAsAt: string | null;
};

const LIVE_KRIS: Array<{ kriId: string; name: string }> = [
  { kriId: "sickness_absence", name: "Sickness Absence Rate" },
  { kriId: "vacancy", name: "Staff Vacancies" },
];

function formatPeriod(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function formatShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

interface KriScoreRow {
  entity_id: string;
  snapshot_date: string;
  normalised_score: number;
  rag_band: string;
  target: number | null;
  min_threshold: number | null;
}

export function useChatContext() {
  const { data: hcData, loading: hcLoading } = useHumanCapitalData();
  const { points: dashPoints, loading: dashLoading } = useScoreHistory("dashboard", "dashboard");
  const forecast = useDashboardForecast();

  const [kriRows, setKriRows] = useState<KriScoreRow[]>([]);
  const [kriLoading, setKriLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setKriLoading(true);
    (async () => {
      const { data } = await supabase
        .from("score_history")
        .select("entity_id, snapshot_date, normalised_score, rag_band, target, min_threshold")
        .eq("entity_type", "kri")
        .in(
          "entity_id",
          LIVE_KRIS.map((k) => k.kriId),
        )
        .order("snapshot_date", { ascending: true });
      if (cancelled) return;
      setKriRows(
        (data ?? []).map((d: any) => ({
          entity_id: d.entity_id,
          snapshot_date: d.snapshot_date,
          normalised_score: Number(d.normalised_score),
          rag_band: d.rag_band,
          target: d.target == null ? null : Number(d.target),
          min_threshold: d.min_threshold == null ? null : Number(d.min_threshold),
        })),
      );
      setKriLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const context = useMemo<ChatContext>(() => {
    const scores = dashPoints.map((p) => Math.round(p.normalised_score));
    const currentScore = scores.length > 0 ? scores[scores.length - 1] : null;
    const spc = classifyTrend(scores);
    const ragBand = currentScore != null ? bandFor(currentScore).name : null;
    const latestSnapshot = dashPoints.length > 0 ? dashPoints[dashPoints.length - 1].snapshot_date : null;
    const dataAsAt = formatPeriod(latestSnapshot);

    const rowsByKri: Record<string, KriScoreRow[]> = {};
    for (const r of kriRows) (rowsByKri[r.entity_id] ??= []).push(r);

    const kris: ChatKRI[] = [];
    for (const { kriId, name } of LIVE_KRIS) {
      const latestCapture = hcData.capturesByKri[kriId]?.[0];
      const series = rowsByKri[kriId] ?? [];
      const latestRow = series[series.length - 1];
      if (!latestCapture || !latestRow || latestCapture.headline_value == null) continue;
      const kriTrend = classifyTrend(series.map((s) => Math.round(s.normalised_score))).direction;
      kris.push({
        name,
        value: Number(latestCapture.headline_value),
        unit: latestCapture.headline_unit ?? "%",
        score: Math.round(latestRow.normalised_score),
        ragBand: bandFor(Math.round(latestRow.normalised_score)).name,
        target: latestRow.target,
        minThreshold: latestRow.min_threshold,
        trend: kriTrend,
      });
    }

    const forecastBlock = forecast.method === "none" || forecast.points.length === 0
      ? { available: false, direction: "Unavailable", periods: 0, horizon: "" }
      : {
          available: true,
          direction: (() => {
            const first = forecast.points[0].value;
            const last = forecast.points[forecast.points.length - 1].value;
            if (last > first + 1) return "Improving";
            if (last < first - 1) return "Worsening";
            return "Steady";
          })(),
          periods: forecast.points.length,
          horizon: `${formatShort(forecast.points[0].date)}–${formatShort(forecast.points[forecast.points.length - 1].date)}`,
        };

    return {
      pillarName: "Human Capital",
      pillarScore: currentScore,
      ragBand,
      trend: spc.direction,
      kris,
      forecast: forecastBlock,
      dataAsAt,
    };
  }, [dashPoints, hcData, kriRows, forecast]);

  return {
    context,
    loading: hcLoading || dashLoading || kriLoading || forecast.loading,
    error: null as string | null,
  };
}
