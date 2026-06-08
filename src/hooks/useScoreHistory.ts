import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ScoreEntityType = "kri" | "indicator" | "pillar" | "dashboard";

export interface ScoreHistoryPoint {
  snapshot_date: string;
  raw_value: number | null;
  normalised_score: number;
  rag_band: "red" | "amber" | "green";
}

export function useScoreHistory(entityType: ScoreEntityType, entityId: string) {
  const [points, setPoints] = useState<ScoreHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const { data, error } = await supabase
        .from("score_history")
        .select("snapshot_date, raw_value, normalised_score, rag_band")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("snapshot_date", { ascending: true });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setPoints([]);
      } else {
        setPoints(
          (data ?? []).map((d) => ({
            snapshot_date: d.snapshot_date as string,
            raw_value: d.raw_value as number | null,
            normalised_score: Number(d.normalised_score),
            rag_band: d.rag_band as "red" | "amber" | "green",
          })),
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId]);

  return { points, loading, error };
}
