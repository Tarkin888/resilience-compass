// TEMPORARY diagnostic.
import { corsHeaders } from "../_shared/scrape.ts";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const targets: { name: string; url: string; headers?: Record<string, string> }[] = [
  { name: "landing-plain", url: "https://digital.nhs.uk/data-and-information/publications/statistical/nhs-sickness-absence-rates" },
  { name: "landing-slash", url: "https://digital.nhs.uk/data-and-information/publications/statistical/nhs-sickness-absence-rates/" },
  {
    name: "landing-browserish",
    url: "https://digital.nhs.uk/data-and-information/publications/statistical/nhs-sickness-absence-rates",
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-GB,en;q=0.9",
      "Upgrade-Insecure-Requests": "1",
    },
  },
  { name: "edition-known", url: "https://digital.nhs.uk/data-and-information/publications/statistical/nhs-sickness-absence-rates/may-2026" },
  { name: "vac-landing", url: "https://digital.nhs.uk/data-and-information/publications/statistical/nhs-vacancies-survey" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const out: unknown[] = [];
  for (const t of targets) {
    try {
      const r = await fetch(t.url, { headers: t.headers, redirect: "follow" });
      const body = await r.text();
      out.push({ name: t.name, status: r.status, len: body.length, finalUrl: r.url, snippet: body.slice(0, 200) });
    } catch (e) {
      out.push({ name: t.name, error: (e as Error).message });
    }
  }
  return new Response(JSON.stringify(out, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
