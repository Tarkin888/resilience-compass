// Shared helpers for NHS scrape edge functions.
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-password",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export type Outcome =
  | "success"
  | "no_new_edition"
  | "page_not_found"
  | "html_parse_failed"
  | "file_download_failed"
  | "value_extract_failed";

export interface CaptureResponse {
  ok: boolean;
  kri_id: string;
  outcome: Outcome;
  capture_id?: string;
  edition_label?: string;
  headline_value?: number;
  error?: string;
}

const NHS_BASE = "https://digital.nhs.uk";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

export function monthName(idx: number): string {
  return MONTHS[((idx % 12) + 12) % 12];
}

/**
 * Quarterly editions are typically published with a 1–2 month lag.
 * Default: subtract 4 months from "now" to land on the most recently
 * likely-published quarter end.
 */
export function defaultQuarterlyEdition(now = new Date()): { month: string; year: number } {
  const d = new Date(now.getFullYear(), now.getMonth() - 4, 1);
  return { month: monthName(d.getMonth()), year: d.getFullYear() };
}

/**
 * Monthly editions are published with a ~2 month lag.
 */
export function defaultMonthlyEdition(now = new Date()): { month: string; year: number } {
  const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return { month: monthName(d.getMonth()), year: d.getFullYear() };
}

export function buildEditionUrl(pattern: string, month: string, year: number): string {
  const path = pattern.replace("{month}", month).replace("{year}", String(year));
  return `${NHS_BASE}${path.startsWith("/") ? path : "/" + path}`;
}

export function editionLabel(month: string, year: number): string {
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`;
}

/**
 * Fetches an HTML page and returns its text. Returns null on 404.
 */
export async function fetchEditionPage(url: string): Promise<{ ok: true; html: string } | { ok: false; status: number }> {
  const res = await fetch(url, { redirect: "follow" });
  if (res.status === 404) return { ok: false, status: 404 };
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, html: await res.text() };
}

/**
 * Parse an edition page HTML and find the first .xlsx link whose URL
 * (or visible text) matches the supplied filename predicate.
 */
export function findXlsxLink(html: string, filenameMatcher: (href: string) => boolean): string | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return null;
  const anchors = doc.querySelectorAll("a[href]");
  for (const a of anchors as unknown as Element[]) {
    const href = (a as Element).getAttribute("href") ?? "";
    if (!href.toLowerCase().endsWith(".xlsx")) continue;
    if (!filenameMatcher(href)) continue;
    if (href.startsWith("http")) return href;
    return `${NHS_BASE}${href.startsWith("/") ? href : "/" + href}`;
  }
  return null;
}

export async function downloadAndHash(url: string): Promise<{ bytes: Uint8Array; sha256: string; size: number }> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  const sha256 = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return { bytes: buf, sha256, size: buf.byteLength };
}
