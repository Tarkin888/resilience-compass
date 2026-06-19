// Shared RAG band helper for pillar/indicator scores on the 0–100 operating range.
// Single source of truth for the red/amber/green palette used by the dial ring,
// headline numbers and pillar-detail headers. Keep these hex values in sync with
// RAG_COLORS in scoringEngine.ts.

export const RED = "#DC2626";
export const AMBER = "#F59E0B";
export const GREEN = "#16A34A";
export const GREY = "#94A3B8";

export type ScoreBand = "red" | "amber" | "green" | "unscored";

/** Band for a 0–100 score (Rick's bands): ≤35 red, 36–66 amber, ≥67 green. */
export function scoreBand(score: number | null | undefined): ScoreBand {
  if (score == null || !Number.isFinite(score)) return "unscored";
  if (score <= 35) return "red";
  if (score >= 67) return "green";
  return "amber";
}

// ---------- HSL helpers for graduated colour interpolation ----------

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (0 <= h && h < 60) {
    r = c;
    g = x;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
  } else if (120 <= h && h < 180) {
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    b = x;
  }
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Return a graduated colour for a 0–100 score, smoothly interpolated across
 * the red → amber → green spectrum.
 *
 * Anchors (Rick's band boundaries):
 *   ≤35  solid red
 *   35→50  red → amber
 *   50→67  amber → green
 *   ≥67  solid green
 */
export function colourForScore(score: number): string {
  if (score <= 35) return RED;
  if (score >= 67) return GREEN;
  if (score <= 50) {
    const t = (score - 35) / (50 - 35);
    const [h1, s1, l1] = hexToHsl(RED);
    const [h2, s2, l2] = hexToHsl(AMBER);
    return hslToHex(lerp(h1, h2, t), lerp(s1, s2, t), lerp(l1, l2, t));
  }
  // 50 < score < 67
  const t = (score - 50) / (67 - 50);
  const [h1, s1, l1] = hexToHsl(AMBER);
  const [h2, s2, l2] = hexToHsl(GREEN);
  return hslToHex(lerp(h1, h2, t), lerp(s1, s2, t), lerp(l1, l2, t));
}

/** Relative luminance of an sRGB hex colour (WCAG formula). */
export function luminance(hex: string): number {
  const rgb = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/**
 * Discrete RAG colour for a 0–100 score, using the same bands as scoreBand().
 * Red ≤ 35, amber 36–66, green ≥ 67. Unscored returns grey.
 */
export function scoreBandColor(score: number | null | undefined): string {
  const band = scoreBand(score);
  switch (band) {
    case "red":
      return RED;
    case "amber":
      return AMBER;
    case "green":
      return GREEN;
    default:
      return GREY;
  }
}
