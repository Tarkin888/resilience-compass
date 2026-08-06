import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StatusPillarInput {
  name: string;
  score: number | null;
  ragBand: string;
  trendLabel: string;
}

export const MAX_SUMMARY_WORDS = 200;

/** Clamp to 200 words client-side, warning if the model overran. */
export function truncateToWordLimit(text: string, limit = MAX_SUMMARY_WORDS): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= limit) return text.trim();
  console.warn(
    `[status-summary] model returned ${words.length} words — truncated to ${limit}.`,
  );
  return `${words.slice(0, limit).join(" ")}…`;
}

async function fetchSummary(pillars: StatusPillarInput[]): Promise<string> {
  const { data, error } = await supabase.functions.invoke("generate-status-summary", {
    body: { pillars },
  });
  if (error || !data || data.error || typeof data.summary !== "string") {
    throw new Error("unavailable");
  }
  return truncateToWordLimit(data.summary);
}

export function useOrgStatusSummary(pillars: StatusPillarInput[], enabled = true) {
  const key = pillars.map((p) => `${p.name}:${p.score ?? "-"}:${p.ragBand}:${p.trendLabel}`);

  const query = useQuery({
    queryKey: ["org-status-summary", key],
    queryFn: () => fetchSummary(pillars),
    enabled: enabled && pillars.length > 0,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    summary: query.data ?? null,
    loading: query.isLoading && enabled && pillars.length > 0,
    error: query.isError ? "unavailable" : null,
  };
}
