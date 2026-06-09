// Edge function: backfill historical KRI captures + recompute score_history
// for the two live NHS England KRIs (vacancy + sickness_absence).
//
// Per-source flow:
//   1. Resolve a single time-series file URL:
//        a) sources.backfill_file_url (admin override) if set;
//        b) otherwise scrape sources.series_landing_page_url for the first
//           .xlsx whose href matches a per-source regex.
//   2. Download + parse the file. Extract ALL periods (monthly for sickness,
//      quarterly for vacancy) and trim to the most recent WINDOW periods.
//   3. Upsert one kri_captures row per period (is_backfill = true).
//   4. Compute score_history rows (kri + indicator) using the signed-range
//      normalisation engine, then roll up to Human pillar and dashboard at
//      each period using the null-excluding average.
//
// Honest status:
//   - Each source reports { rows, file_url, error? } independently.
//   - Top-level `ok` is false (status "partial" or "failed") if EITHER source
//     produced 0 rows. The UI surfaces this instead of pretending success.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import * as XLSX from "npm:xlsx@0.18.5";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";
import { corsHeaders, downloadAndHash, requireAdminAuth } from "../_shared/scrape.ts";

const METHOD_VERSION = "v1-2026-06";
const WINDOW = 24;

const KRI_TO_INDICATOR: Record<string, string> = {
  vacancy: "staff_vacancies",
  sickness_absence: "sickness_absence",
};

// File-name regexes used to pick the right xlsx from a landing/edition page
// when no admin override has been set. Deliberately permissive — admins can
// always paste a direct file URL via the new override input.
const FILE_PATTERNS: Record<string, RegExp[]> = {
  vacancy: [
    /nhs.?vac.*stats.*tables.*\.xlsx$/i,
    /vac.*tables.*\.xlsx$/i,
    /vac.*\.xlsx$/i,
  ],
  sickness_absence: [
    /sickness.?absence.*time.?series.*\.xlsx$/i,
    /sickness.?absence.*\.xlsx$/i,
  ],
};

interface SeriesPoint {
  period_date: string;
  edition_label: string;
  value: number;
}

interface ExtractResult {
  series: SeriesPoint[];
  file_url: string;
  sha256: string;
  size: number;
}

interface SourceRow {
  id: string;
  kri_id: string;
  series_landing_page_url: string;
  backfill_file_url: string | null;
}

// ----- helpers --------------------------------------------------------------

function ragFor(score: number): "red" | "amber" | "green" {
  if (score < 25) return "red";
  if (score < 75) return "amber";
  return "green";
}

function normalise(value: number, target: number, minThreshold: number): number | null {
  if (target === minThreshold) return null;
  const raw = 25 + 50 * ((value - minThreshold) / (target - minThreshold));
  return Math.max(0, Math.min(100, raw));
}

function isoMonthEnd(year: number, monthZeroIdx: number): string {
  const d = new Date(Date.UTC(year, monthZeroIdx + 1, 0));
  return d.toISOString().slice(0, 10);
}

const MONTHS_LONG = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTHS_SHORT = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

function parseMonthYear(label: string): { year: number; month: number } | null {
  const s = label.trim();
  const m = s.match(/^([a-z]{3,9})[\s\-\/]+(\d{2,4})$/i);
  if (m) {
    const idx = MONTHS_SHORT.findIndex((n) => m[1].toLowerCase().startsWith(n));
    if (idx < 0) return null;
    let y = Number(m[2]);
    if (y < 100) y += 2000;
    return { year: y, month: idx };
  }
  return null;
}

function parseQuarter(label: string): { year: number; month: number } | null {
  const s = label.trim();
  let q: number | null = null;
  let fyStart: number | null = null;
  const a = s.match(/Q\s*([1-4]).*?(\d{4})\s*\/\s*\d{2,4}/i);
  const b = s.match(/(\d{4})\s*\/\s*\d{2,4}.*?Q\s*([1-4])/i);
  if (a) { q = Number(a[1]); fyStart = Number(a[2]); }
  else if (b) { fyStart = Number(b[1]); q = Number(b[2]); }
  if (q == null || fyStart == null) return null;
  const endMonth = [5, 8, 11, 2][q - 1];
  const year = q === 4 ? fyStart + 1 : fyStart;
  return { year, month: endMonth };
}

async function discoverFileUrl(landingUrl: string, kriId: string): Promise<string | null> {
  const res = await fetch(landingUrl, { redirect: "follow" });
  if (!res.ok) return null;
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return null;
  const origin = new URL(landingUrl).origin;
  const anchors = Array.from(doc.querySelectorAll("a[href]")) as unknown as Element[];
  const hrefs = anchors
    .map((a) => (a as Element).getAttribute("href") ?? "")
    .filter((h) => h.toLowerCase().endsWith(".xlsx"))
    .map((h) => (h.startsWith("http") ? h : `${origin}${h.startsWith("/") ? h : "/" + h}`));

  for (const pat of FILE_PATTERNS[kriId] ?? []) {
    const hit = hrefs.find((h) => pat.test(h));
    if (hit) return hit;
  }
  // Last-resort: follow the first "publication" / edition page link and look
  // there. NHS Digital landing pages often list editions whose pages hold the
  // actual xlsx download. We only follow one to keep the function bounded.
  const editionHref = anchors
    .map((a) => (a as Element).getAttribute("href") ?? "")
    .find((h) => /publications\/statistical\/.+\/(20\d{2}|.+sickness|.+vacanc)/i.test(h));
  if (editionHref) {
    const editionUrl = editionHref.startsWith("http")
      ? editionHref
      : `${origin}${editionHref.startsWith("/") ? editionHref : "/" + editionHref}`;
    const r2 = await fetch(editionUrl, { redirect: "follow" });
    if (r2.ok) {
      const doc2 = new DOMParser().parseFromString(await r2.text(), "text/html");
      if (doc2) {
        const a2 = Array.from(doc2.querySelectorAll("a[href]")) as unknown as Element[];
        const hrefs2 = a2
          .map((a) => (a as Element).getAttribute("href") ?? "")
          .filter((h) => h.toLowerCase().endsWith(".xlsx"))
          .map((h) => (h.startsWith("http") ? h : `${origin}${h.startsWith("/") ? h : "/" + h}`));
        for (const pat of FILE_PATTERNS[kriId] ?? []) {
          const hit = hrefs2.find((h) => pat.test(h));
          if (hit) return hit;
        }
        if (hrefs2.length) return hrefs2[0];
      }
    }
  }
  return hrefs[0] ?? null;
}

// ----- extractors -----------------------------------------------------------

function extractVacancySeries(bytes: Uint8Array): SeriesPoint[] {
  const wb = XLSX.read(bytes, { type: "array" });
  // Prefer the "Total 2018 onwards" sheet; otherwise scan every sheet for the
  // Grand Total row so we don't fail on naming changes in the compendium.
  const candidateSheets = [
    ...wb.SheetNames.filter((n) => /total\s*20\d{2}\s*onwards/i.test(n)),
    ...wb.SheetNames,
  ];
  for (const sheetName of candidateSheets) {
    const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: null });
    let headerRowIdx = -1;
    for (let i = 0; i < grid.length; i++) {
      if ((grid[i] as unknown[]).some((c) => typeof c === "string" && /total workforce % vacancy rate/i.test(c))) {
        headerRowIdx = i; break;
      }
    }
    if (headerRowIdx < 0) continue;
    // Find the column-label row: first row after the header that contains a
    // parseable quarter label.
    let labelsRow: unknown[] | null = null;
    for (let i = headerRowIdx + 1; i < Math.min(headerRowIdx + 6, grid.length); i++) {
      const r = grid[i] as unknown[];
      if (r.some((c) => typeof c === "string" && parseQuarter(c))) { labelsRow = r; break; }
    }
    let gtRow: unknown[] | null = null;
    for (let i = headerRowIdx + 1; i < grid.length; i++) {
      if ((grid[i] as unknown[]).some((c) => typeof c === "string" && /^\s*grand total\s*$/i.test(c))) {
        gtRow = grid[i] as unknown[]; break;
      }
    }
    if (!gtRow || !labelsRow) continue;

    const series: SeriesPoint[] = [];
    for (let col = 0; col < gtRow.length; col++) {
      const v = gtRow[col];
      if (typeof v !== "number" || !isFinite(v)) continue;
      const rawLabel = (labelsRow[col] ?? "").toString();
      const parsed = parseQuarter(rawLabel);
      if (!parsed) continue;
      // Values in the source workbook are stored as proportions (0.085) — the
      // live capture multiplies by 100 to render a percentage.
      const value = v < 1 ? v * 100 : v;
      series.push({
        period_date: isoMonthEnd(parsed.year, parsed.month),
        edition_label: rawLabel.trim(),
        value: Number(value.toFixed(2)),
      });
    }
    if (series.length) {
      series.sort((a, b) => a.period_date.localeCompare(b.period_date));
      return series;
    }
  }
  return [];
}

function extractSicknessSeries(bytes: Uint8Array): SeriesPoint[] {
  const wb = XLSX.read(bytes, { type: "array" });
  const candidateSheets = [
    ...wb.SheetNames.filter((n) => /time.?series/i.test(n)),
    ...wb.SheetNames.filter((n) => /^table\s*1/i.test(n)),
    ...wb.SheetNames,
  ];
  for (const sheetName of candidateSheets) {
    const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: null });
    let headerIdx = -1;
    let englandCol = -1;
    for (let i = 0; i < grid.length; i++) {
      const idx = (grid[i] as unknown[]).findIndex(
        (c) => typeof c === "string" && /^england$/i.test(c.trim()),
      );
      if (idx >= 0) { headerIdx = i; englandCol = idx; break; }
    }
    if (headerIdx < 0) continue;

    const series: SeriesPoint[] = [];
    for (let i = headerIdx + 1; i < grid.length; i++) {
      const row = grid[i] as unknown[];
      const v = row[englandCol];
      if (typeof v !== "number" || !isFinite(v)) continue;
      const periodCells = row.slice(0, englandCol);
      let year: number | null = null;
      let month: number | null = null;
      let label: string | null = null;
      for (const c of periodCells) {
        if (c instanceof Date) {
          year = c.getUTCFullYear(); month = c.getUTCMonth();
          label = `${MONTHS_LONG[month]} ${year}`; break;
        }
        if (typeof c === "number" && c > 20000 && c < 80000) {
          const ms = Math.round((c - 25569) * 86400 * 1000);
          const d = new Date(ms);
          year = d.getUTCFullYear(); month = d.getUTCMonth();
          label = `${MONTHS_LONG[month]} ${year}`; break;
        }
        if (typeof c === "string") {
          const parsed = parseMonthYear(c);
          if (parsed) { year = parsed.year; month = parsed.month; label = c.trim(); break; }
        }
      }
      if (year == null || month == null) {
        let yr: number | null = null, mo: number | null = null;
        for (const c of periodCells) {
          if (typeof c === "number" && Number.isInteger(c) && c >= 2000 && c <= 2100) yr = c;
          if (typeof c === "string") {
            const idx = MONTHS_SHORT.findIndex((n) => c.toLowerCase().trim().startsWith(n));
            if (idx >= 0) mo = idx;
          }
        }
        if (yr != null && mo != null) {
          year = yr; month = mo; label = `${MONTHS_LONG[mo]} ${yr}`;
        }
      }
      if (year == null || month == null) continue;
      // Sickness rates may be stored as proportions (0.052) or percentages (5.2).
      const value = v < 1 ? v * 100 : v;
      series.push({
        period_date: isoMonthEnd(year, month),
        edition_label: label ?? `${MONTHS_LONG[month]} ${year}`,
        value: Number(value.toFixed(2)),
      });
    }
    if (series.length) {
      series.sort((a, b) => a.period_date.localeCompare(b.period_date));
      return series;
    }
  }
  return [];
}

async function extractForSource(source: SourceRow): Promise<ExtractResult> {
  const fileUrl = source.backfill_file_url
    ?? await discoverFileUrl(source.series_landing_page_url, source.kri_id);
  if (!fileUrl) throw new Error(`no file URL resolved (set sources.backfill_file_url to override)`);
  const { bytes, sha256, size } = await downloadAndHash(fileUrl);
  const series = source.kri_id === "vacancy"
    ? extractVacancySeries(bytes)
    : extractSicknessSeries(bytes);
  return { series: series.slice(-WINDOW), file_url: fileUrl, sha256, size };
}

// ----- main -----------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authErr = requireAdminAuth(req);
  if (authErr) return authErr;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const perSource: Record<string, { rows: number; file_url: string | null; error?: string }> = {
    vacancy: { rows: 0, file_url: null },
    sickness_absence: { rows: 0, file_url: null },
  };

  const { data: sourcesData } = await supabase
    .from("sources")
    .select("id, kri_id, series_landing_page_url, backfill_file_url")
    .in("kri_id", Object.keys(KRI_TO_INDICATOR));
  const sources = (sourcesData ?? []) as SourceRow[];
  const sourceByKri: Record<string, SourceRow> = {};
  sources.forEach((s) => { sourceByKri[s.kri_id] = s; });

  // 1. Extract each source independently — one failure must not poison the other.
  const extracted: Record<string, ExtractResult> = {};
  for (const kri_id of Object.keys(KRI_TO_INDICATOR)) {
    const src = sourceByKri[kri_id];
    if (!src) { perSource[kri_id].error = "source row missing"; continue; }
    try {
      const ex = await extractForSource(src);
      extracted[kri_id] = ex;
      perSource[kri_id].file_url = ex.file_url;
      perSource[kri_id].rows = ex.series.length;
      if (ex.series.length === 0) perSource[kri_id].error = "0 rows parsed from file";
    } catch (e) {
      perSource[kri_id].error = (e as Error).message;
    }
  }

  // 2. Load thresholds (min) per KRI.
  const { data: thresholds } = await supabase
    .from("thresholds")
    .select("kri_id, threshold_value")
    .in("kri_id", Object.keys(KRI_TO_INDICATOR));
  const minThresholdByKri: Record<string, number> = {};
  (thresholds ?? []).forEach((t: { kri_id: string; threshold_value: number }) => {
    minThresholdByKri[t.kri_id] = Number(t.threshold_value);
  });

  // Mirrors src/config/dataPoints.ts — single source of truth duplicated here
  // so backfill normalisation matches the live engine exactly.
  const TARGETS: Record<string, number> = { vacancy: 8.5, sickness_absence: 4.2 };
  const FALLBACK_MIN: Record<string, number> = { vacancy: 12, sickness_absence: 6.0 };

  // 3. Upsert kri_captures rows for every period extracted.
  for (const [kri_id, ex] of Object.entries(extracted)) {
    if (!ex.series.length) continue;
    const src = sourceByKri[kri_id];
    for (const p of ex.series) {
      await supabase.from("kri_captures").upsert({
        kri_id,
        source_id: src.id,
        edition_label: p.edition_label,
        edition_page_url: "(backfill)",
        file_source_url: ex.file_url,
        file_size_bytes: ex.size,
        file_sha256: ex.sha256,
        headline_value: p.value,
        headline_unit: "percent",
        period_date: p.period_date,
        is_backfill: true,
      }, { onConflict: "kri_id,period_date" });
    }
  }

  // 4. Compute score_history rows (kri + indicator) using the engine.
  const periodToKriScores: Record<string, Record<string, number>> = {};
  for (const [kri_id, ex] of Object.entries(extracted)) {
    const target = TARGETS[kri_id];
    const minThreshold = minThresholdByKri[kri_id] ?? FALLBACK_MIN[kri_id];
    for (const p of ex.series) {
      const score = normalise(p.value, target, minThreshold);
      if (score == null) continue;
      const rounded = Math.round(score);
      await supabase.from("score_history").upsert({
        entity_type: "kri",
        entity_id: kri_id,
        snapshot_date: p.period_date,
        raw_value: p.value,
        normalised_score: rounded,
        rag_band: ragFor(rounded),
        target,
        min_threshold: minThreshold,
        method_version: METHOD_VERSION,
      }, { onConflict: "entity_type,entity_id,snapshot_date,method_version" });

      await supabase.from("score_history").upsert({
        entity_type: "indicator",
        entity_id: KRI_TO_INDICATOR[kri_id],
        snapshot_date: p.period_date,
        normalised_score: rounded,
        rag_band: ragFor(rounded),
        method_version: METHOD_VERSION,
      }, { onConflict: "entity_type,entity_id,snapshot_date,method_version" });

      (periodToKriScores[p.period_date] ??= {})[kri_id] = rounded;
    }
  }

  // 5. Roll up Human pillar + dashboard. Null-excluding average across whatever
  //    scored indicators exist at that snapshot — no fabricated lines for
  //    periods where neither source has data.
  for (const [period, scores] of Object.entries(periodToKriScores)) {
    const vals = Object.values(scores);
    if (vals.length === 0) continue;
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    for (const entity_id of ["human", "dashboard"]) {
      const entity_type = entity_id === "dashboard" ? "dashboard" : "pillar";
      await supabase.from("score_history").upsert({
        entity_type,
        entity_id,
        snapshot_date: period,
        normalised_score: avg,
        rag_band: ragFor(avg),
        method_version: METHOD_VERSION,
      }, { onConflict: "entity_type,entity_id,snapshot_date,method_version" });
    }
  }

  // Honest status: any source with 0 rows fails the overall response.
  const anyZero = Object.values(perSource).some((p) => p.rows === 0);
  const allZero = Object.values(perSource).every((p) => p.rows === 0);
  const status = allZero ? "failed" : anyZero ? "partial" : "ok";

  return respond({
    ok: status === "ok",
    status,
    method_version: METHOD_VERSION,
    window_periods: WINDOW,
    sources: perSource,
  }, status === "failed" ? 502 : 200);
});
