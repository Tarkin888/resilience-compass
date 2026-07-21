// Cross-pillar cascade edge function — Prompt 27.
// Given a scenario and the workforce primary delta, ask the model for a
// plausible knock-on across the other four capitals. Response is validated
// client-side; this function returns the raw list.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SYSTEM_PROMPT = `You are a resilience adviser to NHS senior leaders.
You will be given a workforce scenario applied to an NHS Trust, the trust's
current Human Capital score, its projected Human Capital score under the
scenario, and the current scores of the other four capitals
(Financial, Operational, Reputational, Environmental).

Your job: for EACH of those four non-workforce capitals, estimate a plausible
knock-on effect from the workforce shock and give a one-sentence rationale.

Rules — non-negotiable:
- Return EXACTLY four items, one per capital, using pillarId values
  "financial" | "operational" | "reputational" | "environmental".
- "delta" is a signed integer (points) applied to that capital's current score.
- A knock-on cannot exceed the workforce primary shock: |delta| must be at
  most |projected - current| for the Human Capital score.
- Direction sanity: a negative workforce shock should NOT materially improve
  another capital. Any positive delta must be small (typically 0..+2) and
  justified in the rationale.
- Rationale: ONE sentence, UK English, plain language, no jargon or emojis.
  Reference the mechanism (e.g. agency spend, rota cover, patient experience).
- Do NOT quantify projected pillar scores. Only give the delta.

Return ONLY a JSON object of the shape:
{
  "items": [
    { "pillarId": "financial", "delta": -4, "rationale": "..." },
    { "pillarId": "operational", "delta": -6, "rationale": "..." },
    { "pillarId": "reputational", "delta": -4, "rationale": "..." },
    { "pillarId": "environmental", "delta": -1, "rationale": "..." }
  ]
}
No preamble, no markdown fences.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Cascade generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const { scenario, currentHumanScore, projectedHumanScore, otherCapitals } = body ?? {};
    if (
      !scenario ||
      typeof currentHumanScore !== "number" ||
      typeof projectedHumanScore !== "number" ||
      !Array.isArray(otherCapitals)
    ) {
      return new Response(
        JSON.stringify({ error: "Cascade generation failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userPayload = {
      scenario: {
        id: String(scenario.id ?? ""),
        title: String(scenario.title ?? ""),
        type: String(scenario.type ?? ""),
        description: String(scenario.description ?? ""),
      },
      workforce: {
        currentScore: currentHumanScore,
        projectedScore: projectedHumanScore,
        primaryDelta: projectedHumanScore - currentHumanScore,
      },
      otherCapitals,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    let anthropicRes: Response;
    try {
      anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
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
            { role: "user", content: JSON.stringify(userPayload) },
          ],
        }),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Cascade generation failed" }),
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
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed?.items) ? parsed.items : null;
    if (!items || items.length === 0) {
      throw new Error("Invalid cascade shape");
    }

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-cascade error:", err);
    return new Response(
      JSON.stringify({ error: "Cascade generation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
