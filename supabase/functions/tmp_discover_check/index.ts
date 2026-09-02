// TEMPORARY diagnostic: verifies discoverLatestEditionUrl against live NHS Digital.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, discoverLatestEditionUrl } from "../_shared/scrape.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: sources } = await supabase.from("sources").select("*");
  const out: unknown[] = [];
  for (const s of sources ?? []) {
    const matcher = s.kri_id === "vacancy"
      ? (h: string) => /nhs-vac-stats-.*-eng-tables/i.test(h)
      : (h: string) => /sickness.*absence/i.test(h) && /\.xlsx$/i.test(h);
    const r = await discoverLatestEditionUrl(
      s.series_landing_page_url,
      s.edition_page_url_pattern,
      matcher,
    );
    out.push({ kri_id: s.kri_id, editionUrl: r?.editionUrl ?? null, fileUrl: r?.fileUrl ?? null });
  }
  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
