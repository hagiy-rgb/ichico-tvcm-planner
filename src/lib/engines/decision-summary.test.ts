import { describe, expect, it } from "vitest";
import { createDefaultInput } from "@/lib/stores/simulation-store";
import { runSimulation } from "./simulation-engine";
import { buildDecisionSummary } from "./decision-summary";

describe("buildDecisionSummary", () => {
  it("prioritizes the target-reach required GRP message", () => {
    const input = {
      ...createDefaultInput(),
      grp: 100,
      targetReachRatePercent: 70,
    };
    const results = runSimulation(input);
    const summary = buildDecisionSummary(input, results);

    expect(summary.requiredGrp).not.toBeNull();
    expect(summary.gapGrp).toBeGreaterThan(0);
    expect(summary.action).toContain("目標リーチ");
    expect(summary.action).toContain("必要");
  });

  it("reports when the current plan already meets the target", () => {
    const input = {
      ...createDefaultInput(),
      grp: 100,
      targetReachRatePercent: 70,
    };
    const results = runSimulation(input);
    const required = results.reachPlan.requiredGrp!;
    const atTarget = runSimulation({ ...input, grp: required });
    const summary = buildDecisionSummary(
      { ...input, grp: required },
      atTarget,
    );

    expect(summary.gapGrp).not.toBeNull();
    expect(Math.abs(summary.gapGrp!)).toBeLessThan(1);
    expect(summary.action).toContain("ほぼ到達");
  });

  it("keeps method-C GRP as a secondary reference", () => {
    const input = { ...createDefaultInput(), grp: 100, targetReachRatePercent: 70 };
    const results = runSimulation(input);
    const summary = buildDecisionSummary(input, {
      ...results,
      optimalGrp: {
        ...results.optimalGrp,
        minReachUnitPriceGrp: 150,
        minReachUnitPrice: 8_000,
      },
    });

    expect(summary.recommendedGrp).toBe(150);
    expect(summary.deltaGrp).toBe(50);
    expect(summary.action).toContain("最安リーチ単価");
    expect(summary.action).toContain("150");
  });

  it("explains when the target reach is unreachable", () => {
    const input = createDefaultInput();
    const results = runSimulation(input);
    const summary = buildDecisionSummary(input, {
      ...results,
      reachPlan: {
        ...results.reachPlan,
        targetReachRate: 0.99,
        requiredGrp: null,
        requiredBudget: null,
        gapGrp: null,
        gapBudget: null,
      },
    });

    expect(summary.requiredGrp).toBeNull();
    expect(summary.action).toContain("到達できません");
  });
});
