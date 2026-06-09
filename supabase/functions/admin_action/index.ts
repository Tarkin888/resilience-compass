// Gated admin actions: verify password, update sources.last_known_file_url.
// All requests require header `x-admin-password` matching ADMIN_PASSWORD.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-password",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("ADMIN_PASSWORD");
  const provided = req.headers.get("x-admin-password");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorised" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { action?: string; kri_id?: string; last_known_file_url?: string; backfill_file_url?: string; simulate_failure?: boolean } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (body.action === "verify") {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (body.action === "set_override_url") {
    if (!body.kri_id) {
      return new Response(JSON.stringify({ ok: false, error: "kri_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { error } = await supabase
      .from("sources")
      .update({ last_known_file_url: body.last_known_file_url || null })
      .eq("kri_id", body.kri_id);
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (body.action === "set_backfill_url") {
    if (!body.kri_id) {
      return new Response(JSON.stringify({ ok: false, error: "kri_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { error } = await supabase
      .from("sources")
      .update({ backfill_file_url: body.backfill_file_url || null })
      .eq("kri_id", body.kri_id);
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (body.action === "simulate_failure") {
    if (!body.kri_id) {
      return new Response(JSON.stringify({ ok: false, error: "kri_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { error } = await supabase.from("capture_log").insert({
      kri_id: body.kri_id,
      outcome: "page_not_found",
      error_detail: "Simulated failure for demo (admin-triggered).",
    });
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (body.action === "set_simulate_failure") {
    if (!body.kri_id) {
      return new Response(JSON.stringify({ ok: false, error: "kri_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { error } = await supabase
      .from("sources")
      .update({ simulate_failure: !!body.simulate_failure })
      .eq("kri_id", body.kri_id);
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (body.action === "list_sources") {
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .order("kri_id");
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, sources: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (body.action === "list_recent_logs") {
    const { data, error } = await supabase
      .from("capture_log")
      .select("kri_id,outcome,attempt_at,error_detail")
      .order("attempt_at", { ascending: false })
      .limit(50);
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, logs: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (body.action === "reset_demo") {
    const { error: e1 } = await supabase.from("kri_captures").delete().not("id", "is", null);
    if (e1) {
      return new Response(JSON.stringify({ ok: false, error: `kri_captures: ${e1.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { error: e2 } = await supabase.from("capture_log").delete().not("id", "is", null);
    if (e2) {
      return new Response(JSON.stringify({ ok: false, error: `capture_log: ${e2.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: false, error: "unknown action" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
