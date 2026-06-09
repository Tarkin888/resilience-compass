import { describe, it, expect } from "vitest";
import { forecastSeries } from "@/lib/forecast";

function monthlyDates(start: string, n: number): string[] {
  const out: string[] = [];
  const d = new Date(start + "T00:00:00Z");
  for (let i = 0; i < n; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

describe("forecastSeries", () => {
  it("returns no forecast when there are fewer than 8 points", () => {
    const r = forecastSeries({
      scores: [50, 51, 52, 53, 54, 55, 56],
      dates: monthlyDates("2025-01-01", 7),
      cadence: "monthly",
    });
    expect(r.method).toBe("none");
    expect(r.points).toHaveLength(0);
  });

  it("forecasts a flat mean within control limits for a stable series", () => {
    const scores = [50, 52, 49, 51, 50, 53, 48, 51, 50, 52];
    const r = forecastSeries({
      scores,
      dates: monthlyDates("2025-01-01", scores.length),
      cadence: "monthly",
    });
    expect(r.method).toBe("mean+limits");
    expect(r.points).toHaveLength(3);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    r.points.forEach((p) => {
      expect(p.value).toBe(Math.round(mean));
      expect(p.lower).toBeLessThanOrEqual(p.value);
      expect(p.upper).toBeGreaterThanOrEqual(p.value);
    });
  });

  it("projects a falling trend with a widening band", () => {
    // Strong downward run triggers SPC "Worsening" via monotonic run rule.
    const scores = [80, 76, 71, 65, 60, 54, 48, 42];
    const r = forecastSeries({
      scores,
      dates: monthlyDates("2025-01-01", scores.length),
      cadence: "monthly",
    });
    expect(r.method).toBe("trend");
    expect(r.points).toHaveLength(3);
    // central trajectory continues downward
    expect(r.points[2].value).toBeLessThan(r.points[0].value);
    // band widens with horizon
    const w1 = r.points[0].upper - r.points[0].lower;
    const w3 = r.points[2].upper - r.points[2].lower;
    expect(w3).toBeGreaterThanOrEqual(w1);
  });

  it("uses seasonal-naive when given ≥24 monthly points", () => {
    // Two clean years of a seasonal cycle (low in winter).
    const cycle = [60, 62, 65, 64, 60, 55, 50, 45, 48, 52, 55, 58];
    const scores = [...cycle, ...cycle.map((v) => v - 3)]; // year-on-year drop
    const r = forecastSeries({
      scores,
      dates: monthlyDates("2024-01-01", 24),
      cadence: "monthly",
    });
    expect(r.method).toBe("seasonal-naive");
    expect(r.points).toHaveLength(3);
    // First forecast period should reflect same-month-last-year shape, not a flat line.
    expect(r.points[0].value).not.toBe(r.points[1].value);
  });

  it("advances dates correctly for quarterly cadence", () => {
    const scores = [70, 72, 68, 71, 69, 73, 70, 72];
    const r = forecastSeries({
      scores,
      dates: [
        "2024-03-01", "2024-06-01", "2024-09-01", "2024-12-01",
        "2025-03-01", "2025-06-01", "2025-09-01", "2025-12-01",
      ],
      cadence: "quarterly",
    });
    expect(r.points[0].date).toBe("2026-03-01");
    expect(r.points[1].date).toBe("2026-06-01");
    expect(r.points[2].date).toBe("2026-09-01");
  });
});
