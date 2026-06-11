import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Intervention = { rank: number; action: string };

export type UseAIInterventionsResult = {
  interventions: Intervention[];
  loading: boolean;
  error: string | null;
};

interface Args {
  score: number | null;
  ragBand: string | null;
  pillarName?: string;
}

export function useAIInterventions({
  score,
  ragBand,
  pillarName = "Human Capital",
}: Args): UseAIInterventionsResult {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (score == null || !ragBand) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    supabase.functions
      .invoke("generate-interventions", {
        body: { pillarName, score, ragBand },
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
  }, [score, ragBand, pillarName]);

  return { interventions, loading, error };
}
