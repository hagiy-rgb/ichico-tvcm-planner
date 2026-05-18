import { describe, expect, it } from "vitest";
import {
  calculateStationReach,
  combineStationReachRate,
} from "./station-engine";

describe("station-engine", () => {
  it("combines reach with Sainsbury adjustment", () => {
    const combined = combineStationReachRate([0.2, 0.15, 0.18], 0.35);
    expect(combined).toBeGreaterThan(0.2);
    expect(combined).toBeLessThan(0.55);
  });

  it("calculates station reach for 仙台局", () => {
    const result = calculateStationReach({
      area: "宮城",
      target: "個人全体",
      selectedStations: ["TBC", "KHB"],
      totalGrp: 100,
      patternCostKey: "ヨの字",
      effectiveFrequency: 6,
      kEffective: 0.0105,
      correlationRho: 0.35,
    });

    expect(result.rows).toHaveLength(2);
    expect(result.combinedReachRate).toBeGreaterThan(0);
  });
});
