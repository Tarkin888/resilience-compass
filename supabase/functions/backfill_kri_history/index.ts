// Edge function: backfill historical KRI captures + recompute score_history
// for the two live NHS England KRIs (vacancy + sickness_absence).
//
// - Reads the latest edition page (same scrape helpers as the per-KRI fetchers).
// - Extracts the FULL historical series from the same xlsx (Grand Total row for
//   vacancy, England column for sickness absence) instead of just the headline.
// - Trims to the last 24 monthly/quarterly periods.
// - Upserts one kri_captures row per period (is_backfill = true) — idempotent
//   on (kri_id, period_date).
// - Computes a score_history row per period for the KRI; rolls up to the
//   Human pillar and the overall dashboard at every period, using the same
//   normalisation + null-excluding averaging as the live engine.
// - Other pillars and illustrative KRIs are deliberately NOT written: the UI
//   then shows an honest "Historical data not yet available" state.
//
// Auth: shared admin password (same gate as the live capture functions).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import * as XLSX from "npm:xlsx@0.18.5";
import {
  buildEditionUrl,
  corsHeaders,
  defaultMonthlyEdition,
  defaultQuarterlyEdition,
  downloadAndHash,
  fetchEditionPage,
  findXlsxLink,
  requireAdminAuth,
} from "../_shared/scrape.ts";

const METHOD_VERSION = "v1-2026-06";
const WINDOW = 24;

// Mirror the front-end indicator configuration for the two live KRIs.
const KRI_TO_INDICATOR: Record<string, string> = {
  vacancy: "staff_vacancies",
  sickness_absence: "sickness_absence",
};

interface SeriesPoint {
  period_date: string; // YYYY-MM-DD
  edition_label: string;
  value: number;
}

interface ExtractResult {
  series: SeriesPoint[];
  file_url: string;
  sha256: string;
  size: number;
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
  // "January 2024" / "Jan 2024" / "Jan-24"
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

// Vacancy quarter labels look like "Q3 2024/25" or "2024/25 Q3" etc.
function parseQuarter(label: string): { year: number; month: number } | null {
  const s = label.trim();
  const m = s.match(/Q\s*([1-4]).*?(\d{4})\s*\/\s*(\d{2,4})/i)
    ?? s.match(/(\d{4})\s*\/\s*(\d{2,4}).*?Q\s*([1-4])/i);
  if (!m) return null;
  let q: number, fyStart: number;
  if (m.length === 4 && /Q/i.test(s.slice(0, s.search(/Q/i) + 1))) {
    q = Number(m[1]);
    fyStart = Number(m[2]);
  } else {
    fyStart = Number(m[1]);
    q = Number(m[3]);
  }
  // NHS financial year: Q1 = Apr-Jun, Q2 = Jul-Sep, Q3 = Oct-Dec, Q4 = Jan-Mar
  const endMonth = [5, 8, 11, 2][q - 1]; // 0-indexed: Jun, Sep, Dec, Mar
  const year = q === 4 ? fyStart + 1 : fyStart;
  return { year, month: endMonth };
}

// ----- extractors -----------------------------------------------------------

async function extractVacancy(supabase: ReturnType<typeof createClient>): Promise<ExtractResult> {
  const { data: source } = await supabase.from("sources").select("*").eq("kri_id", "vacancy").maybeSingle();
  if (!source) throw new Error("vacancy source row missing");
  const def = defaultQuarterlyEdition();
  const editionUrl = buildEditionUrl(source.edition_page_url_pattern, def.month, def.year);
  const page = await fetchEditionPage(editionUrl);
  if (!page.ok) throw new Error(`vacancy edition page ${page.status}`);
  let fileUrl = findXlsxLink(page.html, (h) => /nhs-vac-stats-.*-eng-tables/i.test(h));
  if (!fileUrl) fileUrl = findXlsxLink(page.html, (h) => /vac.*tables/i.test(h));
  if (!fileUrl && source.last_known_file_url) fileUrl = source.last_known_file_url;
  if (!fileUrl) throw new Error("vacancy: no xlsx link");

  const { bytes, sha256, size } = await downloadAndHash(fileUrl);
  const wb = XLSX.read(bytes, { type: "array" });
  const sheetName = wb.SheetNames.find((n) => /total\s*2018\s*onwards/i.test(n)) ?? wb.SheetNames[0];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: null });

  let headerRowIdx = -1;
  for (let i = 0; i < grid.length; i++) {
    if ((grid[i] as unknown[]).some((c) => typeof c === "string" && /total workforce % vacancy rate/i.test(c))) {
      headerRowIdx = i; break;
    }
  }
  if (headerRowIdx < 0) throw new Error("vacancy: header not found");

  // The next row typically holds column labels (quarter strings).
  const labelsRow = grid[headerRowIdx + 1] as unknown[];
  let gtRow: unknown[] | null = null;
  for (let i = headerRowIdx + 1; i < grid.length; i++) {
    if ((grid[i] as unknown[]).some((c) => typeof c === "string" && /^\s*grand total\s*$/i.test(c))) {
      gtRow = grid[i] as unknown[]; break;
    }
  }
  if (!gtRow) throw new Error("vacancy: Grand Total row missing");

  const series: SeriesPoint[] = [];
  for (let col = 0; col < gtRow.length; col++) {
    const v = gtRow[col];
    if (typeof v !== "number" || !isFinite(v)) continue;
    const rawLabel = (labelsRow?.[col] ?? "").toString();
    const parsed = parseQuarter(rawLabel);
    if (!parsed) continue;
    series.push({
      period_date: isoMonthEnd(parsed.year, parsed.month),
      edition_label: rawLabel.trim(),
      value: Number((v * 100).toFixed(2)),
    });
  }

  series.sort((a, b) => a.period_date.localeCompare(b.period_date));
  return { series: series.slice(-WINDOW), file_url: fileUrl, sha256, size };
}

async function extractSickness(supabase: ReturnType<typeof createClient>): Promise<ExtractResult> {
  const { data: source } = await supabase.from("sources").select("*").eq("kri_id", "sickness_absence").maybeSingle();
  if (!source) throw new Error("sickness_absence source row missing");
  const def = defaultMonthlyEdition();
  const editionUrl = buildEditionUrl(source.edition_page_url_pattern, def.month, def.year);
  const page = await fetchEditionPage(editionUrl);
  if (!page.ok) throw new Error(`sickness edition page ${page.status}`);
  let fileUrl = findXlsxLink(page.html, (h) => /sickness.*absence/i.test(h) && /\.xlsx$/i.test(h));
  if (!fileUrl) fileUrl = findXlsxLink(page.html, () => true);
  if (!fileUrl && source.last_known_file_url) fileUrl = source.last_known_file_url;
  if (!fileUrl) throw new Error("sickness: no xlsx link");

  const { bytes, sha256, size } = await downloadAndHash(fileUrl);
  const wb = XLSX.read(bytes, { type: "array" });
  const sheetName = wb.SheetNames.find((n) => /^table\s*1/i.test(n)) ?? wb.SheetNames[0];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: null });

  let headerIdx = -1;
  let englandCol = -1;
  for (let i = 0; i < grid.length; i++) {
    const idx = (grid[i] as unknown[]).findIndex((c) => typeof c === "string" && /^england$/i.test(c.trim()));
    if (idx >= 0) { headerIdx = i; englandCol = idx; break; }
  }
  if (headerIdx < 0) throw new Error("sickness: 'England' header not found");

  const series: SeriesPoint[] = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const row = grid[i] as unknown[];
    const v = row[englandCol];
    if (typeof v !== "number" || !isFinite(v)) continue;
    // Period cells live left of englandCol.
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
      // Year + Month split into two cells
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
    series.push({
      period_date: isoMonthEnd(year, month),
      edition_label: label ?? `${MONTHS_LONG[month]} ${year}`,
      value: Number(v.toFixed(2)),
    });
  }

  series.sort((a, b) => a.period_date.localeCompare(b.period_date));
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

  const report: Record<string, unknown> = {};

  try {
    // 1. Extract series for both live KRIs (independently — one failure
    //    shouldn't poison the other).
    const extracted: Record<string, ExtractResult> = {};
    for (const [kri_id, fn] of [
      ["vacancy", extractVacancy] as const,
      ["sickness_absence", extractSickness] as const,
    ]) {
      try {
        extracted[kri_id] = await fn(supabase);
        report[`${kri_id}_points`] = extracted[kri_id].series.length;
      } catch (e) {
        report[`${kri_id}_error`] = (e as Error).message;
      }
    }

    // 2. Load source + threshold ids needed for inserts.
    const { data: sources } = await supabase.from("sources").select("id, kri_id");
    const sourceIdByKri: Record<string, string> = {};
    (sources ?? []).forEach((s: { id: string; kri_id: string }) => { sourceIdByKri[s.kri_id] = s.id; });

    const { data: thresholds } = await supabase
      .from("thresholds")
      .select("kri_id, threshold_value")
      .in("kri_id", Object.keys(KRI_TO_INDICATOR));
    const minThresholdByKri: Record<string, number> = {};
    (thresholds ?? []).forEach((t: { kri_id: string; threshold_value: number }) => {
      minThresholdByKri[t.kri_id] = Number(t.threshold_value);
    });

    // Targets come from the front-end config, mirrored here to keep one source
    // of truth: scoringEngine uses these values, and the front-end uses these
    // very thresholds as `target`. We keep the per-KRI target table small and
    // explicit so backfill matches the live engine exactly.
    const TARGETS: Record<string, number> = {
      vacancy: 8.5,
      sickness_absence: 4.2,
    };
    const FALLBACK_MIN: Record<string, number> = {
      // Mirror dataPoints.ts so old threshold rows don't break scoring.
      vacancy: 12,
      sickness_absence: 6.0,
    };

    // 3. Upsert kri_captures rows.
    for (const [kri_id, ex] of Object.entries(extracted)) {
      for (const p of ex.series) {
        await supabase.from("kri_captures").upsert({
          kri_id,
          source_id: sourceIdByKri[kri_id],
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

    // 4. Compute score_history rows from extracted series (single source of
    //    truth for scoring is the engine formula — duplicated here in Deno).
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

        // Indicator = single KRI in our config, so same score.
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

    // 5. Roll up to Human pillar and dashboard at each period (null-excluding
    //    average across whatever scored indicators exist at that snapshot).
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

    report.ok = true;
    report.method_version = METHOD_VERSION;
    return respond(report);
  } catch (e) {
    return respond({ ok: false, error: (e as Error).message, partial: report }, 500);
  }
});
