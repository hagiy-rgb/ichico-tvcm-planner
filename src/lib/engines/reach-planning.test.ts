import { describe, expect, it } from "vitest";
import { calculateReach } from "./reach-engine";
import { buildReachPlan, findGrpForTargetReach } from "./reach-planning";

describe("reach-planning", () => {
  const reachRateAtGrp = (grp: number) =>
    calculateReach({
      population: 1_000_000,
      grp,
      effectiveFrequency: 6,
      cmCoefficient: 0.01,
    }).reachRate;

  it("finds the minimum GRP that meets a target reach (F=6, k=0.01)", () => {
    const required = findGrpForTargetReach({
      targetReachRate: 0.78,
      reachRateAtGrp,
    });
    expect(required).not.toBeNull();
    expect(required!).toBeGreaterThan(700);
    expect(required!).toBeLessThan(850);
    expect(reachRateAtGrp(required!)).toBeGreaterThanOrEqual(0.78);
    expect(reachRateAtGrp(required! - 1)).toBeLessThan(0.78);
  });

  it("returns null when the target is unreachable within maxGrp", () => {
    expect(
      findGrpForTargetReach({
        targetReachRate: 0.999,
        reachRateAtGrp,
        maxGrp: 100,
      }),
    ).toBeNull();
  });

  it("builds a reach plan with budget = GRP × perCost", () => {
    const plan = buildReachPlan({
      targetReachRatePercent: 70,
      currentGrp: 100,
      currentReachRate: reachRateAtGrp(100),
      perCost: 4107,
      reachRateAtGrp,
    });
    expect(plan.requiredGrp).not.toBeNull();
    expect(plan.requiredBudget).toBeCloseTo(plan.requiredGrp! * 4107, 0);
    expect(plan.gapGrp).toBeCloseTo(plan.requiredGrp! - 100, 6);
  });
});
