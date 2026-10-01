import { describe, expect, it } from "vitest";
import {
  buildStationReachModel,
  calculateStationReach,
  combineStationReachRate,
  combinedReachRateAt,
  stationGrpShares,
} from "./station-engine";

const baseInput = {
  area: "宮城",
  target: "個人全体",
  selectedStations: ["TBC", "KHB"],
  totalGrp: 100,
  patternCostKey: "ヨの字",
  effectiveFrequency: 6,
  kEffective: 0.0105,
  correlationRho: 0.35,
};

describe("station-engine", () => {
  it("combines reach with Sainsbury adjustment", () => {
    const combined = combineStationReachRate([0.2, 0.15, 0.18], 0.35);
    expect(combined).toBeGreaterThan(0.2);
    expect(combined).toBeLessThan(0.55);
  });

  it("calculates station reach for 仙台局", () => {
    const result = calculateStationReach(baseInput);

    expect(result.rows).toHaveLength(2);
    expect(result.combinedReachRate).toBeGreaterThan(0);
  });

  it("allocates GRP shares inversely to per-cost (cost_weighted favors cheaper stations)", () => {
    expect(stationGrpShares([8000, 4000], "cost_weighted")).toEqual([
      1 / 3,
      2 / 3,
    ]);
    expect(stationGrpShares([8000, 4000], "equal")).toEqual([0.5, 0.5]);
    expect(stationGrpShares([0, 0], "cost_weighted")).toEqual([0.5, 0.5]);
    expect(stationGrpShares([8000, 4000], "manual", [25, 75])).toEqual([
      0.25, 0.75,
    ]);
  });

  it("splits GRP by inverse cost ratio and weights per-cost by the split", () => {
    const stationPerCosts = { TBC: 8000, KHB: 4000 };
    const weighted = calculateStationReach({
      ...baseInput,
      stationPerCosts,
      allocation: "cost_weighted",
    });
    const tbc = weighted.rows.find((r) => r.station === "TBC")!;
    const khb = weighted.rows.find((r) => r.station === "KHB")!;
    // 安い KHB に厚く → TBC:KHB = 1:2
    expect(tbc.grp / khb.grp).toBeCloseTo(0.5, 10);
    expect(tbc.grp + khb.grp).toBeCloseTo(100, 10);

    const equal = calculateStationReach({
      ...baseInput,
      stationPerCosts,
      allocation: "equal",
    });
    for (const row of equal.rows) {
      expect(row.grp).toBeCloseTo(50, 10);
    }

    const model = buildStationReachModel({
      ...baseInput,
      stationPerCosts,
      allocation: "cost_weighted",
    });
    // Σ(配分比率 × 局単価) = (1/3)*8000 + (2/3)*4000 = 16000/3
    expect(model.weightedPerCost).toBeCloseTo(16000 / 3, 6);
  });

  it("fast combined-rate path matches the full evaluation", () => {
    const model = buildStationReachModel(baseInput);
    for (const grp of [0, 50, 300, 1200]) {
      expect(combinedReachRateAt(model, grp)).toBeCloseTo(
        calculateStationReach({ ...baseInput, totalGrp: grp }).combinedReachRate,
        12,
      );
    }
  });
});
