// Edge function: scrape NHS Vacancy Statistics edition page,
// download the data tables xlsx, extract Total workforce % vacancy rate
// (Grand Total, most recent quarter), and write a kri_captures row plus
// a capture_log entry. Loud-failure: every attempt is logged.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import * as XLSX from "npm:xlsx@0.18.5";
import {
  buildEditionUrl,
  CaptureResponse,
  corsHeaders,
  defaultQuarterlyEdition,
  discoverLatestEditionUrl,
  downloadAndHash,
  editionLabel,
  fetchEditionPage,
  findXlsxLink,
  monthName,
  Outcome,
  requireAdminAuth,
  sanitiseErrorDetail,
  validateEditionInput,
  withinCadenceWindow,
} from "../_shared/scrape.ts";

const KRI_ID = "vacancy";

interface InvokeBody {
  month?: string; // e.g. "january"
  year?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authErr = requireAdminAuth(req);
  if (authErr) return authErr;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: InvokeBody = {};
  if (req.method === "POST") {
    try { body = await req.json(); } catch { body = {}; }
  }

  const writeLog = async (outcome: Outcome, error_detail?: string, linked_capture_id?: string) => {
    await supabase.from("capture_log").insert({
      kri_id: KRI_ID, outcome, error_detail: sanitiseErrorDetail(error_detail), linked_capture_id: linked_capture_id ?? null,
    });
  };
  const respond = (r: CaptureResponse, status = 200) =>
    new Response(JSON.stringify(r), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { data: source, error: sErr } = await supabase
      .from("sources").select("*").eq("kri_id", KRI_ID).maybeSingle();
    if (sErr || !source) {
      await writeLog("page_not_found", "source row missing");
      return respond({ ok: false, kri_id: KRI_ID, outcome: "page_not_found", error: "source row missing" }, 500);
    }

    if ((source as { simulate_failure?: boolean }).simulate_failure) {
      await writeLog("page_not_found", "simulated failure (admin toggle)");
      return respond({ ok: false, kri_id: KRI_ID, outcome: "page_not_found", error: "simulated failure" }, 200);
    }

    const VAC_XLSX = (h: string) => /nhs-vac-stats-.*-eng-tables/i.test(h);

    let def: { month: string; year: number } | null = null;
    let editionUrl: string;
    let discovered: { editionUrl: string; html: string; fileUrl: string } | null = null;

    if (body.month !== undefined || body.year !== undefined) {
      const v = validateEditionInput(body.month, body.year);
      if (!v.ok) {
        return respond({ ok: false, kri_id: KRI_ID, outcome: "page_not_found", error: v.error }, 400);
      }
      def = { month: v.month, year: v.year };
      editionUrl = buildEditionUrl(source.edition_page_url_pattern, def.month, def.year);
    } else {
      discovered = await discoverLatestEditionUrl(
        source.series_landing_page_url,
        source.edition_page_url_pattern,
        VAC_XLSX,
      );
      if (discovered) {
        editionUrl = discovered.editionUrl;
        // Recover month/year from the discovered slug where possible so the
        // stored edition label stays consistent with the guessed-URL path.
        const slug = editionUrl.split("/").pop() ?? "";
        const m = slug.match(/([a-z]+)-(\d{4})/i);
        if (m) {
          const v = validateEditionInput(m[1], Number(m[2]));
          if (v.ok) def = { month: v.month, year: v.year };
        }
      } else {
        def = defaultQuarterlyEdition();
        editionUrl = buildEditionUrl(source.edition_page_url_pattern, def.month, def.year);
      }
    }
    const label = def ? editionLabel(def.month, def.year) : (editionUrl.split("/").pop() ?? "latest");

    // Idempotency: skip if we've already captured this edition.
    const { data: existing } = await supabase
      .from("kri_captures").select("id, edition_label, captured_at")
      .eq("kri_id", KRI_ID).order("captured_at", { ascending: false }).limit(1);
    if (existing && existing[0]?.edition_label === label) {
      await writeLog("no_new_edition", `already captured ${label}`);
      return respond({ ok: true, kri_id: KRI_ID, outcome: "no_new_edition", edition_label: label });
    }
    const lastCapturedAt = existing?.[0]?.captured_at ?? null;

    let pageHtml: string | null = null;
    // Set when the edition page could not be fetched at all but a known-good
    // file URL is configured — used as a full override so the capture can
    // still proceed by downloading and parsing that file directly.
    let overrideFileUrl: string | null = null;
    if (discovered) {
      pageHtml = discovered.html;
    } else {
      const page = await fetchEditionPage(editionUrl);
      if (!page.ok) {
        if (page.status === 404 && withinCadenceWindow(lastCapturedAt, source.update_cadence)) {
          const friendly = "No new edition published yet — next check after expected publication window.";
          await writeLog("no_new_edition", friendly);
          return respond({ ok: false, kri_id: KRI_ID, outcome: "no_new_edition", error: friendly }, 200);
        }
        if (source.last_known_file_url) {
          overrideFileUrl = source.last_known_file_url;
        } else {
          const detail = `edition page returned ${page.status} for ${editionUrl}`;
          await writeLog("page_not_found", detail);
          return respond({ ok: false, kri_id: KRI_ID, outcome: "page_not_found", error: detail }, 200);
        }
      } else {
        pageHtml = page.html;
      }
    }

    let fileUrl = overrideFileUrl
      ?? discovered?.fileUrl
      ?? (pageHtml ? findXlsxLink(pageHtml, VAC_XLSX) : null);
    if (!fileUrl && pageHtml) fileUrl = findXlsxLink(pageHtml, (h) => /vac.*tables/i.test(h));

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
    // Authoritative edition label, parsed from the workbook's period row
    // (e.g. "2026/27 Q1 (Jun-26)") — falls back to the provisional date-based
    // label if parsing fails.
    let fileLabel: string | null = null;
    try {
      const wb = XLSX.read(bytes, { type: "array" });
      const sheetName = wb.SheetNames.find((n) => /total\s*2018\s*onwards/i.test(n)) ?? wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });

      // Find header row containing "Total workforce % vacancy rate"
      let headerRowIdx = -1;
      for (let i = 0; i < grid.length; i++) {
        const row = grid[i] as unknown[];
        if (row.some((c) => typeof c === "string" && /total workforce % vacancy rate/i.test(c))) {
          headerRowIdx = i; break;
        }
      }
      if (headerRowIdx < 0) throw new Error("header 'Total workforce % vacancy rate' not found");

      // Find Grand Total row below header
      let gtRow: unknown[] | null = null;
      for (let i = headerRowIdx + 1; i < grid.length; i++) {
        const row = grid[i] as unknown[];
        if (row.some((c) => typeof c === "string" && /^\s*grand total\s*$/i.test(c))) {
          gtRow = row; break;
        }
      }
      if (!gtRow) throw new Error("'Grand Total' row not found");

      // Right-most numeric cells: most recent and prior quarter, tracking
      // their column indices so we can read the matching period labels.
      const numerics: number[] = [];
      const numericCols: number[] = [];
      for (let i = gtRow.length - 1; i >= 0 && numerics.length < 2; i--) {
        const v = gtRow[i];
        if (typeof v === "number" && isFinite(v)) {
          numerics.push(v);
          numericCols.push(i);
        }
      }
      if (numerics.length === 0) throw new Error("no numeric values in Grand Total row");
      headline = numerics[0] * 100;
      prior = numerics[1] != null ? numerics[1] * 100 : null;

      // Period-label row: immediately below the "Total workforce % vacancy
      // rate" header; one label per data column, e.g. "2026/27 Q1 (Jun-26)".
      const periodRow = grid[headerRowIdx + 1] as unknown[] | undefined;
      if (periodRow) {
        const cell = periodRow[numericCols[0]];
        if (typeof cell === "string") {
          const m = cell.match(/\(([A-Za-z]{3})-(\d{2})\)/);
          if (m) {
            let monthIdx = -1;
            for (let i = 0; i < 12; i++) {
              if (monthName(i).startsWith(m[1].toLowerCase())) { monthIdx = i; break; }
            }
            if (monthIdx >= 0) {
              const year = 2000 + Number(m[2]);
              fileLabel = `${monthName(monthIdx).charAt(0).toUpperCase()}${monthName(monthIdx).slice(1)} ${year}`;
            }
          }
        }
      }
    } catch (e) {
      const detail = `extract failed: ${(e as Error).message}`;
      await writeLog("value_extract_failed", detail);
      return respond({ ok: false, kri_id: KRI_ID, outcome: "value_extract_failed", error: detail }, 200);
    }

    // Authoritative edition label = period parsed from the workbook; the
    // date-based label is a fallback only.
    const finalLabel = fileLabel ?? label;

    const { data: cap, error: capErr } = await supabase.from("kri_captures").insert({
      kri_id: KRI_ID,
      source_id: source.id,
      edition_label: finalLabel,
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
      capture_id: cap.id, edition_label: finalLabel, headline_value: Number(headline.toFixed(2)),
    });
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    await writeLog("value_extract_failed", `unhandled: ${msg}`);
    return respond({ ok: false, kri_id: KRI_ID, outcome: "value_extract_failed", error: msg }, 500);
  }
});
