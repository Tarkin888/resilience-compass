import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SYSTEM_PROMPT = `You are a resilience improvement adviser supporting NHS senior leaders.
You will be given an organisational resilience pillar name, its current score,
its RAG band, and — where available — individual KRI (Key Risk Indicator) values
with their targets.

Return exactly 4 prioritised interventions to improve resilience in that pillar.
Rules:
- Where KRI values are provided, reference the specific metric and value in at least 2 of the 4 interventions.
- Each intervention must be concise (one sentence, max 25 words), actionable, and appropriate for NHS Trust leadership level.
- Do not invent metrics or values not provided.
- Do not quantify projected score improvements.

Format your response as a JSON array with this structure:
[
  { "rank": 1, "action": "..." },
  { "rank": 2, "action": "..." },
  { "rank": 3, "action": "..." },
  { "rank": 4, "action": "..." }
]
Return only valid JSON. No preamble, no explanation, no markdown fences.`;

type KRI = { name: string; value: number; target: number; unit: string };

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

    const { pillarName, score, ragBand, kris } = await req.json();
    if (!pillarName || typeof score !== "number" || !ragBand) {
      return new Response(
        JSON.stringify({ error: "Intervention generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const krisArr: KRI[] = Array.isArray(kris) ? kris : [];
    const krisPayload = krisArr.length > 0 ? JSON.stringify(krisArr) : "None provided";

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
            content: `Pillar: ${pillarName}. Score: ${score}. RAG band: ${ragBand}.\nKRIs: ${krisPayload}.`,
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
    const rawText: string = data?.content?.[0]?.text ?? "";
    // Strip markdown code fences if the model wraps its JSON despite instructions.
    const text = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
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
