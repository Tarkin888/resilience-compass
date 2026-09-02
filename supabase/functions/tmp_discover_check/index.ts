// TEMPORARY diagnostic: verifies discoverLatestEditionUrl against live NHS Digital.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, discoverLatestEditionUrl, fetchEditionPage, findEditionCandidates, publicationPathPrefix } from "../_shared/scrape.ts";

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
    const landing = await fetchEditionPage(s.series_landing_page_url);
    const prefix = publicationPathPrefix(s.edition_page_url_pattern);
    const cands = landing.ok ? findEditionCandidates(landing.html, prefix) : [];
    out.push({
      kri_id: s.kri_id,
      landing_ok: landing.ok,
      landing_status: landing.ok ? 200 : landing.status,
      html_len: landing.ok ? landing.html.length : 0,
      prefix,
      candidates: cands.slice(0, 8),
      editionUrl: r?.editionUrl ?? null,
      fileUrl: r?.fileUrl ?? null,
    });
  }
  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
