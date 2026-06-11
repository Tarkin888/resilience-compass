import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SYSTEM_PROMPT = `You are a resilience improvement adviser supporting NHS senior leaders. 
You will be given an organisational resilience pillar name, its current score, 
and its RAG band. Return exactly 4 prioritised interventions to improve resilience 
in that pillar. Each intervention must be concise (one sentence, max 20 words), 
actionable, and appropriate for NHS Trust leadership level. 
Format your response as a JSON array with this structure:
[
  { "rank": 1, "action": "..." },
  { "rank": 2, "action": "..." },
  { "rank": 3, "action": "..." },
  { "rank": 4, "action": "..." }
]
Return only valid JSON. No preamble, no explanation, no markdown fences.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Intervention generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { pillarName, score, ragBand } = await req.json();
    if (!pillarName || typeof score !== "number" || !ragBand) {
      return new Response(
        JSON.stringify({ error: "Intervention generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Pillar: ${pillarName}. Score: ${score}. RAG band: ${ragBand}.`,
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Intervention generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await anthropicRes.json();
    const text = data?.content?.[0]?.text ?? "";
    const interventions = JSON.parse(text);

    if (!Array.isArray(interventions) || interventions.length === 0) {
      throw new Error("Invalid interventions shape");
    }

    return new Response(JSON.stringify({ interventions }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-interventions error:", err);
    return new Response(
      JSON.stringify({ error: "Intervention generation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
