import { describe, expect, it } from "vitest";
import {
  calculateOptimalGrp,
  costPerThousandReachedAtGrp,
  findMarginalEfficiency,
  findMinReachUnitPriceOnCurve,
  poissonReachRateAtGrp,
  type OptimizerContext,
} from "./optimizer";
import type { ReachCurvePoint } from "@/types/simulation";

const population = 2_249_000;
const baseCtx: OptimizerContext = {
  reachRateAtGrp: poissonReachRateAtGrp({
    population,
    effectiveFrequency: 6,
    kEffective: 0.0105,
  }),
  population,
  perCost: 4500,
  webVideoCpm: 2.3,
  maxGrp: 1500,
};

describe("optimizer", () => {
  it("finds smallest GRP reaching web cost parity (same dimension: yen per thousand)", () => {
    const result = calculateOptimalGrp(baseCtx);
    expect(result.webParityGrp).not.toBeNull();
    const grp = result.webParityGrp!;
    const target = baseCtx.webVideoCpm! * 1000;
    // パリティ点ではリーチ千人単価がベンチマーク（円/千再生）以下
    expect(costPerThousandReachedAtGrp(baseCtx, grp)).toBeLessThanOrEqual(target);
    // 最小GRPであること（1つ手前では上回る）
    expect(costPerThousandReachedAtGrp(baseCtx, grp - 1)).toBeGreaterThan(target);
  });

  it("returns null when parity is unreachable", () => {
    const result = calculateOptimalGrp({ ...baseCtx, webVideoCpm: 0.5 });
    expect(result.webParityGrp).toBeNull();
  });

  it("measures method B from the peak marginal efficiency, not from GRP=1", () => {
    const { grp, peakGrp } = findMarginalEfficiency(baseCtx);
    expect(peakGrp).not.toBeNull();
    expect(grp).not.toBeNull();
    // F=6 のS字カーブでは限界効率のピークは低GRP側ではなく中盤に来る
    expect(peakGrp!).toBeGreaterThan(100);
    expect(grp!).toBeGreaterThan(peakGrp!);
    // 探索上限を返していない（旧実装の不具合）
    expect(grp!).toBeLessThan(baseCtx.maxGrp!);

    const marginal = (g: number) =>
      baseCtx.reachRateAtGrp(g + 1) - baseCtx.reachRateAtGrp(g);
    const peak = marginal(peakGrp!);
    expect(marginal(grp!)).toBeLessThanOrEqual(peak * 0.5);
    expect(marginal(grp! - 1)).toBeGreaterThan(peak * 0.5);
  });

  it("returns null for method B when the 50% point is beyond the search range", () => {
    const result = calculateOptimalGrp({ ...baseCtx, maxGrp: 300 });
    expect(result.marginalEfficiencyGrp).toBeNull();
    expect(result.searchMaxGrp).toBe(300);
  });

  it("finds minimum reach unit price on curve", () => {
    const points: ReachCurvePoint[] = [
      { grp: 50, reachRate: 0.1, reachCount: 1000, reachUnitPrice: 5000 },
      { grp: 100, reachRate: 0.2, reachCount: 2000, reachUnitPrice: 3000 },
      { grp: 200, reachRate: 0.35, reachCount: 3500, reachUnitPrice: 3500 },
    ];
    const min = findMinReachUnitPriceOnCurve(points);
    expect(min.grp).toBe(100);
    expect(min.reachUnitPrice).toBe(3000);
  });

  it("includes min reach unit price in calculateOptimalGrp", () => {
    const curve: ReachCurvePoint[] = [
      { grp: 100, reachRate: 0.2, reachCount: 2000, reachUnitPrice: 4000 },
      { grp: 150, reachRate: 0.28, reachCount: 2800, reachUnitPrice: 3200 },
    ];
    const result = calculateOptimalGrp(baseCtx, curve);
    expect(result.minReachUnitPriceGrp).toBe(150);
    expect(result.minReachUnitPrice).toBe(3200);
  });
});
