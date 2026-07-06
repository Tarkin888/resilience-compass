import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SYSTEM_PROMPT = `You are a resilience improvement adviser supporting NHS senior leaders.
You will be given an organisational resilience pillar name, its current score,
its RAG band, and a list of the pillar's data points with their current values,
targets, minimum thresholds, units and direction (higherIsBetter | lowerIsBetter).

Return EXACTLY 4 prioritised interventions to improve resilience in that pillar.

For each intervention you MUST classify it into one of three tiers based on FOUR factors:
resource required (money and people), time to implement, expected impact, and reversibility.

  Level 1 — No regret: minimal cost, minimal effort, quick to implement, easy to reverse. You would do these regardless.
  Level 2 — Committed effort: meaningful cost and effort, weeks-to-months to implement, reversible but not painlessly.
  Level 3 — Last resort: high cost, high effort, long implementation, potentially irreversible. Undertake only when the position demands it.

You MUST include at least one Level 1 and at least one Level 2 intervention across the 4 items.

Wording rules:
- Description phrasing MUST be indicative, not a guarantee. Use "typically could reduce ... towards the X target" or "typically could increase ... towards the X target". Never "reduce from X to Y" or a point estimate.
- Where a data point is provided, reference the specific metric and current value in at least 2 of the 4 interventions.
- Do not invent metrics or values that were not provided.
- Do not quantify projected score improvements.
- Concise: one sentence description, max 28 words. UK English.

For each intervention:
- pick ONE targetDataPointId from the provided list — the data point this intervention primarily acts on.
- propose an assumedValue: the value that data point could PLAUSIBLY reach as a result of this intervention within roughly 3 months. It must be no better than the target and no worse than the currentValue, respecting direction.
- tierRationale: 1–2 sentences that explicitly mention resource/cost, time and reversibility considerations.

Return ONLY a JSON array. No preamble, no markdown fences. Shape:
[
  {
    "id": "kebab-slug",
    "title": "Short action title (max 8 words)",
    "description": "One-sentence softened impact statement.",
    "tier": 1,
    "tierRationale": "Why this tier — mention cost, time, reversibility.",
    "targetDataPointId": "one of the provided data point ids",
    "assumedValue": 4.5,
    "timeToImpact": "3-6 months"
  }
]`;

type DataPointInfo = {
  id: string;
  name: string;
  currentValue: number | null;
  target: number;
  minimumThreshold: number;
  unit: string;
  direction: "higherIsBetter" | "lowerIsBetter";
};

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

    const { pillarName, score, ragBand, dataPoints } = await req.json();
    if (!pillarName || typeof score !== "number" || !ragBand) {
      return new Response(
        JSON.stringify({ error: "Intervention generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const dps: DataPointInfo[] = Array.isArray(dataPoints) ? dataPoints : [];
    const dpPayload = dps.length > 0 ? JSON.stringify(dps) : "None provided";

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Pillar: ${pillarName}. Score: ${score}. RAG band: ${ragBand}.\nData points: ${dpPayload}.`,
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
