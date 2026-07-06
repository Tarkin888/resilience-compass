import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface InterventionTarget {
  dataPointId: string;
  assumedValue: number;
}

export interface TieredIntervention {
  id: string;
  title: string;
  description: string;
  tier: 1 | 2 | 3;
  tierRationale: string;
  targets: InterventionTarget[];
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
    return Math.min(target, Math.max(currentValue, proposed));
  }
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
          if (tier !== 1 && tier !== 2 && tier !== 3) {
            console.warn("[interventions] discarded — invalid tier:", raw);
            continue;
          }

          // Accept new `targets: [{dataPointId, assumedValue}]`; fall back to
          // legacy `targetDataPointId` + `assumedValue` if the model returned that.
          const rawTargets: Array<{ dataPointId?: unknown; assumedValue?: unknown }> =
            Array.isArray(raw?.targets)
              ? raw.targets
              : raw?.targetDataPointId != null
                ? [{ dataPointId: raw.targetDataPointId, assumedValue: raw.assumedValue }]
                : [];

          const validTargets: InterventionTarget[] = [];
          for (const t of rawTargets.slice(0, 3)) {
            const dpId = String(t?.dataPointId ?? "");
            const dp = dpById.get(dpId);
            if (!dp || dp.currentValue == null) {
              console.warn("[interventions] target dropped — unknown data point:", t);
              continue;
            }
            const proposed = Number(t?.assumedValue);
            if (!Number.isFinite(proposed)) {
              console.warn("[interventions] target dropped — invalid assumedValue:", t);
              continue;
            }
            const clamped = clampAssumed(proposed, dp.currentValue, dp.target, dp.direction);
            if (clamped !== proposed) {
              console.warn("[interventions] assumedValue clamped", {
                id: raw?.id,
                dpId,
                proposed,
                clamped,
              });
            }
            validTargets.push({ dataPointId: dpId, assumedValue: clamped });
          }

          if (validTargets.length === 0) {
            console.warn("[interventions] discarded — no valid targets:", raw);
            continue;
          }

          cleaned.push({
            id: String(raw?.id ?? `intv-${cleaned.length + 1}`),
            title: String(raw?.title ?? "Intervention"),
            description: String(raw?.description ?? ""),
            tier: tier as 1 | 2 | 3,
            tierRationale: String(raw?.tierRationale ?? ""),
            targets: validTargets,
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
