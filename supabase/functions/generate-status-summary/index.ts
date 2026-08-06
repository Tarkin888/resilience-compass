import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SYSTEM_PROMPT = `You are a resilience analyst writing a short status update for NHS senior leaders.

You will be given an array of exactly five organisational resilience pillars, each with:
{ name, score, ragBand, trendLabel }.

Write ONE paragraph of plain text summarising today's position.

Hard rules:
- Maximum 200 words. One paragraph. Plain text only — no markdown, no headings, no bullet points, no emojis.
- Open with an overall descriptor (for example "broadly stable", "showing early strain", "under pressure") derived ONLY from the mix of RAG bands and trend labels supplied. Never a numeric average.
- NEVER produce a single overall, blended or organisation-wide score of any kind.
- Name at least the one or two pillars most driving the picture, referencing their band and trend.
- Do NOT invent metrics, values, causes, events or external context that are not in the supplied data.
- Do not speculate. Do not recommend specific named programmes.
- UK English throughout.

Return ONLY JSON in the shape: { "summary": "..." }
No preamble, no markdown fences.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Summary generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pillars } = await req.json();
    if (!Array.isArray(pillars) || pillars.length === 0) {
      return new Response(JSON.stringify({ error: "Summary generation failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safePillars = pillars.slice(0, 5).map((p) => ({
      name: String(p?.name ?? ""),
      score: typeof p?.score === "number" ? p.score : null,
      ragBand: String(p?.ragBand ?? "unscored"),
      trendLabel: String(p?.trendLabel ?? ""),
    }));

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 700,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: `Pillars: ${JSON.stringify(safePillars)}` },
        ],
      }),
    });

    if (!res.ok) {
      console.error("Anthropic API error:", res.status, await res.text());
      return new Response(JSON.stringify({ error: "Summary generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const rawText: string = data?.content?.[0]?.text ?? "";
    const text = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(text);
    const summary = typeof parsed?.summary === "string" ? parsed.summary.trim() : "";
    if (!summary) throw new Error("Empty summary");

    return new Response(JSON.stringify({ summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-status-summary error:", err);
    return new Response(JSON.stringify({ error: "Summary generation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
