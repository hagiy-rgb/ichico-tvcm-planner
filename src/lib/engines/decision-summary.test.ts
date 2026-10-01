import { describe, expect, it } from "vitest";
import { createDefaultInput } from "@/lib/stores/simulation-store";
import { runSimulation } from "./simulation-engine";
import { buildDecisionSummary } from "./decision-summary";

describe("buildDecisionSummary", () => {
  it("recommends increasing GRP when method C is above the current plan", () => {
    const input = { ...createDefaultInput(), grp: 100 };
    const results = runSimulation(input);
    const summary = buildDecisionSummary(input, {
      ...results,
      perCost: 20_000,
      optimalGrp: {
        ...results.optimalGrp,
        minReachUnitPriceGrp: 150,
        minReachUnitPrice: 8_000,
      },
    });

    expect(summary.currentGrp).toBe(100);
    expect(summary.recommendedGrp).toBe(150);
    expect(summary.deltaGrp).toBe(50);
    expect(summary.deltaBudget).toBe(1_000_000);
    expect(summary.action).toContain("増やして");
    expect(summary.action).toContain("150");
  });

  it("recommends decreasing GRP when method C is below the current plan", () => {
    const input = { ...createDefaultInput(), grp: 400 };
    const results = runSimulation(input);
    const summary = buildDecisionSummary(input, {
      ...results,
      optimalGrp: {
        ...results.optimalGrp,
        minReachUnitPriceGrp: 250,
        minReachUnitPrice: 7_000,
      },
    });

    expect(summary.deltaGrp).toBe(-150);
    expect(summary.action).toContain("減らして");
    expect(summary.action).toContain("250");
  });

  it("treats a difference under 1 GRP as already near the cheapest unit price", () => {
    const input = { ...createDefaultInput(), grp: 200 };
    const results = runSimulation(input);
    const summary = buildDecisionSummary(input, {
      ...results,
      optimalGrp: {
        ...results.optimalGrp,
        minReachUnitPriceGrp: 200.4,
        minReachUnitPrice: results.reachUnitPrice,
      },
    });

    expect(summary.deltaGrp).toBeCloseTo(0.4, 10);
    expect(summary.action).toContain("最安リーチ単価付近");
  });

  it("explains when method C cannot identify a GRP", () => {
    const input = createDefaultInput();
    const results = runSimulation(input);
    const summary = buildDecisionSummary(input, {
      ...results,
      optimalGrp: {
        ...results.optimalGrp,
        minReachUnitPriceGrp: null,
        minReachUnitPrice: null,
      },
    });

    expect(summary.recommendedGrp).toBeNull();
    expect(summary.deltaGrp).toBeNull();
    expect(summary.deltaBudget).toBeNull();
    expect(summary.action).toContain("特定できません");
  });
});
