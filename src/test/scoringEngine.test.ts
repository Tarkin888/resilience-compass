import { describe, it, expect, vi } from "vitest";
import {
  normaliseScore,
  ragBand,
  rollupIndicator,
  scoreDataPoint,
  type DataPoint,
} from "@/lib/scoringEngine";

describe("scoringEngine", () => {
  it("matches Rick's worked example (higherIsBetter)", () => {
    // % roles filled in < 45 working days, target=95, threshold=75, value=90
    expect(normaliseScore(90, 95, 75)).toBe(62.5);
  });

  it("places threshold at 25 and target at 75 (higherIsBetter)", () => {
    expect(normaliseScore(75, 95, 75)).toBe(25);
    expect(normaliseScore(95, 95, 75)).toBe(75);
  });

  it("places threshold at 25 and target at 75 (lowerIsBetter)", () => {
    // lower is better: target=4.2, threshold=8.5
    expect(normaliseScore(8.5, 4.2, 8.5)).toBe(25);
    expect(normaliseScore(4.2, 4.2, 8.5)).toBe(75);
  });

  it("clamps above 100 and below 0", () => {
    expect(normaliseScore(200, 95, 75)).toBe(100);
    expect(normaliseScore(0, 95, 75)).toBe(0);
  });

  it("returns null for missing value or invalid config", () => {
    expect(normaliseScore(null, 95, 75)).toBeNull();
    expect(normaliseScore(50, 75, 75)).toBeNull();
  });

  it("RAG bands", () => {
    expect(ragBand(0)).toBe("red");
    expect(ragBand(24)).toBe("red");
    expect(ragBand(25)).toBe("amber");
    expect(ragBand(74)).toBe("amber");
    expect(ragBand(75)).toBe("green");
    expect(ragBand(100)).toBe("green");
  });

  it("rolls up unweighted average and excludes missing values", () => {
    const dps: DataPoint[] = [
      { id: "a", name: "A", target: 95, minimumThreshold: 75, unit: "%", direction: "higherIsBetter", source: "Illustrative", value: 90 }, // 62.5
      { id: "b", name: "B", target: 95, minimumThreshold: 75, unit: "%", direction: "higherIsBetter", source: "Illustrative", value: 95 }, // 75
      { id: "c", name: "C", target: 95, minimumThreshold: 75, unit: "%", direction: "higherIsBetter", source: "Illustrative", value: null }, // excluded
    ];
    const r = rollupIndicator(dps);
    expect(r.scoredCount).toBe(2);
    expect(r.totalCount).toBe(3);
    expect(r.score).toBeCloseTo((62.5 + 75) / 2);
  });

  it("invalid config is flagged and excluded, no crash", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dp: DataPoint = { id: "x", name: "X", target: 50, minimumThreshold: 50, unit: "%", direction: "higherIsBetter", source: "Illustrative", value: 50 };
    const s = scoreDataPoint(dp);
    expect(s.score).toBeNull();
    expect(s.invalidConfig).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
