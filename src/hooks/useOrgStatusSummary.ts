import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StatusPillarInput {
  name: string;
  score: number | null;
  ragBand: string;
  trendLabel: string;
}

export const MAX_SUMMARY_WORDS = 200;

function stripDanglingBold(text: string): string {
  const count = (text.match(/\*\*/g) ?? []).length;
  if (count % 2 === 0) return text;
  const last = text.lastIndexOf("**");
  return (text.slice(0, last) + text.slice(last + 2)).trimEnd();
}

const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** Clamp to 200 words, preserving paragraph breaks and bold markers. */
export function truncateToWordLimit(text: string, limit = MAX_SUMMARY_WORDS): string {
  const trimmed = text.trim();
  const total = wordCount(trimmed);
  if (total <= limit) return trimmed;

  console.warn(
    `[status-summary] model returned ${total} words — truncated to ${limit}.`,
  );

  const paragraphs = trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const kept: string[] = [];
  let used = 0;

  for (const p of paragraphs) {
    const n = wordCount(p);
    if (used + n <= limit) {
      kept.push(p);
      used += n;
      continue;
    }
    const remaining = limit - used;
    if (kept.length === 0 || remaining > 0) {
      const partial = p.split(/\s+/).slice(0, Math.max(remaining, 0)).join(" ");
      if (partial) kept.push(`${stripDanglingBold(partial)}…`);
    }
    break;
  }

  return stripDanglingBold(kept.join("\n\n"));
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
