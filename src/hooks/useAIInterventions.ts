import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Intervention = { rank: number; action: string };

export type KRI = { name: string; value: number; target: number; unit: string };

export type UseAIInterventionsResult = {
  interventions: Intervention[];
  loading: boolean;
  error: string | null;
};

interface Args {
  score: number | null;
  ragBand: string | null;
  pillarName?: string;
  kris?: KRI[];
}

export function useAIInterventions({
  score,
  ragBand,
  pillarName = "Human Capital",
  kris,
}: Args): UseAIInterventionsResult {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable key so the effect only re-runs when KRI values actually change.
  const krisKey = useMemo(() => JSON.stringify(kris ?? []), [kris]);

  useEffect(() => {
    if (score == null || !ragBand) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    const parsedKris: KRI[] = JSON.parse(krisKey);

    supabase.functions
      .invoke("generate-interventions", {
        body: { pillarName, score, ragBand, kris: parsedKris },
      })
      .then(({ data, error: invokeError }) => {
        if (cancelled) return;
        if (invokeError || !data || data.error) {
          setError("unavailable");
          setInterventions([]);
        } else if (Array.isArray(data.interventions)) {
          setInterventions(data.interventions);
        } else {
          setError("unavailable");
        }
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
  }, [score, ragBand, pillarName, krisKey]);

  return { interventions, loading, error };
}
