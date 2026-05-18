import { describe, expect, it } from "vitest";
import {
  buildWeeklyGrpSchedule,
  calculateAwareness,
  iterateWeeklyAdstock,
} from "./awareness-engine";

describe("awareness-engine", () => {
  it("builds even weekly GRP schedule", () => {
    expect(buildWeeklyGrpSchedule(100, 4, "even_weekly")).toEqual([
      25, 25, 25, 25,
    ]);
  });

  it("accumulates adstock with decay", () => {
    const series = iterateWeeklyAdstock([100, 0, 0], 0.5, 0.3, 1.05);
    expect(series[0]).toBeCloseTo(31.5, 1);
    expect(series[1]).toBeCloseTo(15.75, 1);
    expect(series[2]).toBeCloseTo(7.875, 1);
  });

  it("calculates awareness for FMCG-like inputs", () => {
    const result = calculateAwareness({
      totalGrp: 1000,
      campaignWeeks: 4,
      grpAllocation: "even_weekly",
      lambdaWeekly: 0.58,
      alphaConversion: 0.3,
      alphaAwareness: 0.06,
      patternCoefficient: 1.05,
    });

    expect(result.awarenessRate).toBeGreaterThan(0);
    expect(result.awarenessCurve).toHaveLength(4);
    expect(result.finalAdstock).toBeGreaterThan(0);
  });
});
