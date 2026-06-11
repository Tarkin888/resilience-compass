import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SYSTEM_PROMPT_TEMPLATE = `You are a resilience data assistant for NHS senior leaders using the ResilienceC dashboard.
Your role is to answer questions about the organisation's resilience data in plain English.

STRICT RULES — follow all of them on every response:
1. Only use data from the context payload provided. Do not invent statistics, cite external benchmarks, or speculate beyond the provided data.
2. If a question cannot be answered from the available data, say: "I don't have that data available — this dashboard currently covers the Human Capital pillar only."
3. Every substantive answer must cite at least one specific metric value with its date (e.g. "Sickness absence was 5.43% as at February 2026").
4. Do not give clinical, financial, legal, or operational advice. Resilience data questions only.
5. Responses must be concise: 2–4 sentences for simple questions; a short structured answer (max 6 sentences) for complex ones. No preamble.
6. Do not repeat the question back to the user.
7. RAG bands: Red = 0–24, Amber = 25–74, Green = 75–100. A score of 100 is clamped (the maximum). Scores above the target are clamped at 100 for lower-is-better metrics.
8. You are not a substitute for professional judgement. Do not make recommendations beyond what the data shows.

CONTEXT:
{{CONTEXT_JSON}}`;

type ChatMessage = { role: "user" | "assistant"; content: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Chat unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { messages, context } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0 || !context) {
      return new Response(
        JSON.stringify({ error: "Chat unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cleanMessages: ChatMessage[] = messages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m: any) => ({ role: m.role, content: m.content }));

    const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace(
      "{{CONTEXT_JSON}}",
      JSON.stringify(context, null, 2),
    );

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
        system: systemPrompt,
        messages: cleanMessages,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Chat unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await anthropicRes.json();
    const rawText: string = data?.content?.[0]?.text ?? "";
    const reply = rawText
      .trim()
      .replace(/^```(?:\w+)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    if (!reply) {
      return new Response(
        JSON.stringify({ error: "Chat unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("resc-chat error:", err);
    return new Response(
      JSON.stringify({ error: "Chat unavailable" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
