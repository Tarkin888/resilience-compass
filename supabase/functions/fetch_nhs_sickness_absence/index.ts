// Edge function: scrape NHS Sickness Absence Rates monthly edition page,
// download the headline xlsx, extract England's most recent monthly rate
// from Table 1, write kri_captures row + capture_log entry.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import * as XLSX from "npm:xlsx@0.18.5";
import {
  buildEditionUrl,
  CaptureResponse,
  corsHeaders,
  defaultMonthlyEdition,
  downloadAndHash,
  editionLabel,
  fetchEditionPage,
  findXlsxLink,
  Outcome,
  requireAdminAuth,
  sanitiseErrorDetail,
  validateEditionInput,
} from "../_shared/scrape.ts";

const KRI_ID = "sickness_absence";

interface InvokeBody { month?: string; year?: number; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authError = requireAdminAuth(req);
  if (authError) return authError;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: InvokeBody = {};
  if (req.method === "POST") { try { body = await req.json(); } catch { body = {}; } }

  const writeLog = async (outcome: Outcome, error_detail?: string, linked_capture_id?: string) => {
    await supabase.from("capture_log").insert({
      kri_id: KRI_ID, outcome, error_detail: sanitiseErrorDetail(error_detail), linked_capture_id: linked_capture_id ?? null,
    });
  };
  const respond = (r: CaptureResponse, status = 200) =>
    new Response(JSON.stringify(r), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { data: source } = await supabase.from("sources").select("*").eq("kri_id", KRI_ID).maybeSingle();
    if (!source) {
      await writeLog("page_not_found", "source row missing");
      return respond({ ok: false, kri_id: KRI_ID, outcome: "page_not_found", error: "source row missing" }, 500);
    }

    const def = body.month && body.year
      ? { month: body.month.toLowerCase(), year: body.year }
      : defaultMonthlyEdition();
    const editionUrl = buildEditionUrl(source.edition_page_url_pattern, def.month, def.year);
    const label = editionLabel(def.month, def.year);

    const { data: existing } = await supabase
      .from("kri_captures").select("id, edition_label")
      .eq("kri_id", KRI_ID).order("captured_at", { ascending: false }).limit(1);
    if (existing && existing[0]?.edition_label === label) {
      await writeLog("no_new_edition", `already captured ${label}`);
      return respond({ ok: true, kri_id: KRI_ID, outcome: "no_new_edition", edition_label: label });
    }

    const page = await fetchEditionPage(editionUrl);
    if (!page.ok) {
      const detail = `edition page returned ${page.status} for ${editionUrl}`;
      await writeLog("page_not_found", detail);
      return respond({ ok: false, kri_id: KRI_ID, outcome: "page_not_found", error: detail }, 200);
    }

    let fileUrl = findXlsxLink(page.html, (h) => /sickness.*absence/i.test(h) && /\.xlsx$/i.test(h));
    if (!fileUrl) fileUrl = findXlsxLink(page.html, () => true);
    if (!fileUrl && source.last_known_file_url) fileUrl = source.last_known_file_url;
    if (!fileUrl) {
      const detail = "no matching xlsx link on edition page";
      await writeLog("html_parse_failed", detail);
      return respond({ ok: false, kri_id: KRI_ID, outcome: "html_parse_failed", error: detail }, 200);
    }

    let bytes: Uint8Array, sha256: string, size: number;
    try {
      ({ bytes, sha256, size } = await downloadAndHash(fileUrl));
    } catch (e) {
      const detail = `download failed: ${(e as Error).message}`;
      await writeLog("file_download_failed", detail);
      return respond({ ok: false, kri_id: KRI_ID, outcome: "file_download_failed", error: detail }, 200);
    }

    let headline: number | null = null;
    let prior: number | null = null;
    try {
      const wb = XLSX.read(bytes, { type: "array" });
      const sheetName = wb.SheetNames.find((n) => /^table\s*1/i.test(n)) ?? wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });

      // Find header row that includes "England" (column B).
      let headerIdx = -1;
      let englandCol = -1;
      for (let i = 0; i < grid.length; i++) {
        const row = grid[i] as unknown[];
        const idx = row.findIndex((c) => typeof c === "string" && /^england$/i.test(c.trim()));
        if (idx >= 0) { headerIdx = i; englandCol = idx; break; }
      }
      if (headerIdx < 0) throw new Error("'England' header not found in Table 1");

      const series: number[] = [];
      for (let i = headerIdx + 1; i < grid.length; i++) {
        const v = (grid[i] as unknown[])[englandCol];
        if (typeof v === "number" && isFinite(v)) series.push(v);
      }
      if (series.length === 0) throw new Error("no numeric values in England column");
      headline = series[series.length - 1];
      prior = series.length >= 2 ? series[series.length - 2] : null;
    } catch (e) {
      const detail = `extract failed: ${(e as Error).message}`;
      await writeLog("value_extract_failed", detail);
      return respond({ ok: false, kri_id: KRI_ID, outcome: "value_extract_failed", error: detail }, 200);
    }

    const { data: cap, error: capErr } = await supabase.from("kri_captures").insert({
      kri_id: KRI_ID,
      source_id: source.id,
      edition_label: label,
      edition_page_url: editionUrl,
      file_source_url: fileUrl,
      file_size_bytes: size,
      file_sha256: sha256,
      headline_value: Number(headline.toFixed(2)),
      headline_unit: "percent",
      prior_value: prior != null ? Number(prior.toFixed(2)) : null,
    }).select("id").single();
    if (capErr) {
      await writeLog("value_extract_failed", `insert failed: ${capErr.message}`);
      return respond({ ok: false, kri_id: KRI_ID, outcome: "value_extract_failed", error: capErr.message }, 500);
    }

    await writeLog("success", undefined, cap.id);
    return respond({
      ok: true, kri_id: KRI_ID, outcome: "success",
      capture_id: cap.id, edition_label: label, headline_value: Number(headline.toFixed(2)),
    });
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    await writeLog("value_extract_failed", `unhandled: ${msg}`);
    return respond({ ok: false, kri_id: KRI_ID, outcome: "value_extract_failed", error: msg }, 500);
  }
});
