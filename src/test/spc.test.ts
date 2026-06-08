import { describe, expect, it } from "vitest";
import { classifyTrend } from "@/lib/spc";

describe("classifyTrend (SPC)", () => {
  it("returns Establishing baseline below the minimum-points threshold", () => {
    const r = classifyTrend([60, 61, 59, 60, 62, 60, 61]);
    expect(r.direction).toBe("Establishing baseline");
    expect(r.points).toBe(7);
  });

  it("treats noisy-but-flat data as Steady", () => {
    const r = classifyTrend([60, 62, 59, 61, 60, 58, 61, 62, 59, 60, 61, 59]);
    expect(r.direction).toBe("Steady");
  });

  it("flags 7 consecutive falling readings as Worsening", () => {
    const r = classifyTrend([70, 70, 70, 70, 70, 70, 70, 68, 66, 64, 62, 60, 58]);
    expect(r.direction).toBe("Worsening");
  });

  it("flags 7 consecutive rising readings as Improving", () => {
    const r = classifyTrend([50, 50, 50, 50, 50, 50, 50, 52, 54, 56, 58, 60, 62]);
    expect(r.direction).toBe("Improving");
  });

  it("flags a point below the lower control limit as Worsening", () => {
    const r = classifyTrend([60, 61, 59, 60, 62, 60, 61, 59, 60, 61, 60, 20]);
    expect(r.direction).toBe("Worsening");
  });

  it("flags a point above the upper control limit as Improving", () => {
    const r = classifyTrend([60, 61, 59, 60, 62, 60, 61, 59, 60, 61, 60, 99]);
    expect(r.direction).toBe("Improving");
  });
});
