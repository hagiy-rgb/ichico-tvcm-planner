import { describe, expect, it } from "vitest";
import { getPopulation } from "@/lib/masters/area-master";
import { calculateReach, reachRateToPercent } from "./reach-engine";

describe("reach-engine", () => {
  it("loads 宮城・個人全体 population from master", () => {
    expect(getPopulation("宮城", "個人全体")).toBe(2_249_000);
  });

  it("calculates reach with Poisson model (FSD formula)", () => {
    const population = getPopulation("宮城", "個人全体");
    const result = calculateReach({
      population,
      grp: 100,
      effectiveFrequency: 6,
      cmCoefficient: 0.01,
    });

    expect(result.lambda).toBeCloseTo(1, 10);
    // k×GRP=1, F=6 のとき理論リーチ率は約0.06%
    expect(reachRateToPercent(result.reachRate)).toBeCloseTo(0.06, 1);
    expect(result.reachCount).toBe(Math.round(population * result.reachRate));
  });

  /**
   * キックオフ照合値（約27.6%）は λ≈4.38（k×GRP×視聴率補正）で再現可能。
   * 既存Excelのλ定義に視聴率係数が含まれる可能性あり — 萩さん確認待ち。
   */
  it("reproduces ~27.6% when effective lambda matches Excel calibration", () => {
    const population = getPopulation("宮城", "個人全体");
    const result = calculateReach({
      population,
      grp: 100,
      effectiveFrequency: 6,
      cmCoefficient: 0.01,
      effectiveCoefficient: 0.0438,
    });

    expect(reachRateToPercent(result.reachRate)).toBeCloseTo(27.6, 0);
  });

  it("returns zero reach when GRP is zero", () => {
    const result = calculateReach({
      population: 1_000_000,
      grp: 0,
      effectiveFrequency: 6,
      cmCoefficient: 0.01,
    });
    expect(result.reachRate).toBe(0);
    expect(result.reachCount).toBe(0);
  });

  it("increases reach as GRP increases", () => {
    const base = {
      population: 2_249_000,
      effectiveFrequency: 6,
      cmCoefficient: 0.01,
    };
    const r50 = calculateReach({ ...base, grp: 50 });
    const r100 = calculateReach({ ...base, grp: 100 });
    expect(r100.reachRate).toBeGreaterThan(r50.reachRate);
  });
});
