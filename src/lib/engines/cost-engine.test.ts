import { describe, expect, it } from "vitest";
import { calculateCost } from "./cost-engine";

describe("cost-engine", () => {
  it("calculates budget and CPM from GRP and per cost", () => {
    const result = calculateCost({
      grp: 100,
      perCost: 4500,
      population: 2_249_000,
      reachRate: 0.276,
    });

    expect(result.totalBudget).toBe(450_000);
    expect(result.cpm).toBeCloseTo(200.09, 0);
    expect(result.reachUnitPrice).toBeCloseTo(16304.35, 0);
  });

  it("returns zero budget when GRP is zero", () => {
    const result = calculateCost({
      grp: 0,
      perCost: 4500,
      population: 1_000_000,
      reachRate: 0,
    });
    expect(result.totalBudget).toBe(0);
    expect(result.cpm).toBe(0);
  });
});
