import { describe, expect, it } from "vitest";
import {
  collectReachUnitPricesForDomain,
  findMinReachUnitPricePoint,
  reachCurveGrpMax,
  reachUnitPriceYDomain,
} from "./reach-curve-chart-utils";

describe("reachCurveGrpMax", () => {
  it("extends input grp by 400 grp headroom", () => {
    expect(reachCurveGrpMax(300)).toBe(700);
    expect(reachCurveGrpMax(800)).toBe(1200);
    expect(reachCurveGrpMax(0)).toBe(400);
  });
});

describe("reachUnitPriceYDomain", () => {
  it("zooms axis tightly around minimum", () => {
    const [low, high] = reachUnitPriceYDomain([50_000, 45_000, 42_000, 48_000]);
    expect(low).toBeLessThan(42_000);
    expect(high).toBeGreaterThan(42_000);
    expect(high).toBeLessThan(80_000);
    expect(low).toBeGreaterThanOrEqual(0);
  });

  it("excludes low-grp spikes and zooms tightly around minimum", () => {
    const [low, high] = reachUnitPriceYDomain([200_000, 45_000, 42_000, 48_000]);
    expect(high).toBeLessThan(90_000);
    expect(low).toBeLessThan(42_000);
    expect(high - low).toBeLessThan(60_000);
  });

  it("returns fallback when no valid values", () => {
    expect(reachUnitPriceYDomain([0, Infinity, NaN])).toEqual([0, 100]);
  });
});

describe("collectReachUnitPricesForDomain", () => {
  it("skips grp 0", () => {
    expect(
      collectReachUnitPricesForDomain([
        { grp: 0, reachRate: 0, reachCount: 0, reachUnitPrice: 999_999 },
        { grp: 100, reachRate: 10, reachCount: 1000, reachUnitPrice: 50_000 },
      ]),
    ).toEqual([50_000]);
  });
});

describe("findMinReachUnitPricePoint", () => {
  it("finds minimum across series excluding grp 0", () => {
    const result = findMinReachUnitPricePoint([
      {
        target: "M1",
        points: [
          { grp: 0, reachRate: 0, reachCount: 0, reachUnitPrice: 999_999 },
          { grp: 100, reachRate: 10, reachCount: 1000, reachUnitPrice: 50_000 },
          { grp: 200, reachRate: 15, reachCount: 1500, reachUnitPrice: 40_000 },
        ],
      },
    ]);
    expect(result).toEqual({
      target: "M1",
      grp: 200,
      reachUnitPrice: 40_000,
    });
  });
});
