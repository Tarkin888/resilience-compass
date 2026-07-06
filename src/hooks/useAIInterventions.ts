import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TieredIntervention {
  id: string;
  title: string;
  description: string;
  tier: 1 | 2 | 3;
  tierRationale: string;
  targetDataPointId: string;
  currentValue: number;
  assumedValue: number;
  timeToImpact: string;
}

export type DataPointInfo = {
  id: string;
  name: string;
  currentValue: number | null;
  target: number;
  minimumThreshold: number;
  unit: string;
  direction: "higherIsBetter" | "lowerIsBetter";
};

export type UseAIInterventionsResult = {
  interventions: TieredIntervention[];
  loading: boolean;
  error: string | null;
};

interface Args {
  score: number | null;
  ragBand: string | null;
  pillarName?: string;
  dataPoints?: DataPointInfo[];
}

function clampAssumed(
  proposed: number,
  currentValue: number,
  target: number,
  direction: "higherIsBetter" | "lowerIsBetter",
): number {
  if (direction === "higherIsBetter") {
    // best = target (larger), worst allowed = currentValue
    return Math.min(target, Math.max(currentValue, proposed));
  }
  // lowerIsBetter: best = target (smaller), worst allowed = currentValue
  return Math.max(target, Math.min(currentValue, proposed));
}

export function useAIInterventions({
  score,
  ragBand,
  pillarName = "Human Capital",
  dataPoints,
}: Args): UseAIInterventionsResult {
  const [interventions, setInterventions] = useState<TieredIntervention[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dpKey = useMemo(() => JSON.stringify(dataPoints ?? []), [dataPoints]);

  useEffect(() => {
    if (score == null || !ragBand) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    const parsedDps: DataPointInfo[] = JSON.parse(dpKey);
    const dpById = new Map(parsedDps.map((d) => [d.id, d]));

    supabase.functions
      .invoke("generate-interventions", {
        body: { pillarName, score, ragBand, dataPoints: parsedDps },
      })
      .then(({ data, error: invokeError }) => {
        if (cancelled) return;
        if (invokeError || !data || data.error || !Array.isArray(data.interventions)) {
          setError("unavailable");
          setInterventions([]);
          return;
        }
        const cleaned: TieredIntervention[] = [];
        for (const raw of data.interventions) {
          const tier = Number(raw?.tier);
          const dpId = String(raw?.targetDataPointId ?? "");
          const dp = dpById.get(dpId);
          if (!dp || dp.currentValue == null) {
            console.warn("[interventions] discarded — unknown data point:", raw);
            continue;
          }
          if (tier !== 1 && tier !== 2 && tier !== 3) {
            console.warn("[interventions] discarded — invalid tier:", raw);
            continue;
          }
          const proposed = Number(raw?.assumedValue);
          if (!Number.isFinite(proposed)) {
            console.warn("[interventions] discarded — invalid assumedValue:", raw);
            continue;
          }
          const clamped = clampAssumed(proposed, dp.currentValue, dp.target, dp.direction);
          if (clamped !== proposed) {
            console.warn("[interventions] assumedValue clamped", { id: raw?.id, proposed, clamped });
          }
          cleaned.push({
            id: String(raw?.id ?? `intv-${cleaned.length + 1}`),
            title: String(raw?.title ?? "Intervention"),
            description: String(raw?.description ?? ""),
            tier: tier as 1 | 2 | 3,
            tierRationale: String(raw?.tierRationale ?? ""),
            targetDataPointId: dpId,
            currentValue: dp.currentValue,
            assumedValue: clamped,
            timeToImpact: String(raw?.timeToImpact ?? ""),
          });
        }
        setInterventions(cleaned);
        if (cleaned.length === 0) setError("unavailable");
      })
      .catch(() => {
        if (!cancelled) setError("unavailable");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [score, ragBand, pillarName, dpKey]);

  return { interventions, loading, error };
}
