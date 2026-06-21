import type { HumanCapitalData } from "./useHumanCapitalData";

/**
 * Single source of truth for the "last successful capture" timestamp shown
 * across the homepage feed bar, the Live Risk Alerts banner, and /admin/status.
 * Returns the max captured_at across LIVE KRIs (ISO string), or null when
 * no successful captures exist.
 */
export function getLastSuccessfulCapture(data: HumanCapitalData): string | null {
  const liveKriIds = new Set(
    data.definitions.filter((d) => d.is_live).map((d) => d.kri_id),
  );
  let latest: string | null = null;
  Object.entries(data.capturesByKri).forEach(([kriId, caps]) => {
    if (liveKriIds.size > 0 && !liveKriIds.has(kriId)) return;
    const t = caps[0]?.captured_at;
    if (t && (latest === null || t > latest)) latest = t;
  });
  return latest;
}
