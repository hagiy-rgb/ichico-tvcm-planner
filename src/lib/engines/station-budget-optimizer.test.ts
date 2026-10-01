import { describe, expect, it } from "vitest";
import { buildRecommendedCoefficients } from "./coefficient-engine";
import { getPresetBlocks } from "./creative-pattern-engine";
import {
  optimizeStationBudgetForMaxReach,
  resolvePracticalShareBounds,
} from "./station-budget-optimizer";
import { runSimulation } from "./simulation-engine";

const baseInput = {
  area: "宮城",
  target: "個人全体",
  industryCode: "FMCG_FOOD",
  creativePattern: {
    presetName: "ヨの字" as const,
    blocks: getPresetBlocks("ヨの字"),
  },
  coefficients: buildRecommendedCoefficients("FMCG_FOOD", "awareness"),
  funnelStage: "awareness" as const,
  grp: 400,
  campaignWeeks: 4,
  grpDistribution: "even" as const,
  selectedStations: ["TBC", "OXTV", "MMT", "KHB"],
  cmLength: 30 as const,
};

describe("resolvePracticalShareBounds", () => {
  it("uses half of equal share as min and raises max for feasibility", () => {
    const four = resolvePracticalShareBounds(4);
    expect(four.minBudgetShare).toBeCloseTo(0.125, 6);
    expect(four.maxBudgetShare).toBeGreaterThanOrEqual(0.4);

    const two = resolvePracticalShareBounds(2);
    expect(two.minBudgetShare).toBeCloseTo(0.25, 6);
    // 2局×40%では合計80%しか埋まらないため引き上げ
    expect(two.maxBudgetShare).toBeGreaterThanOrEqual(0.5);
  });
});

describe("optimizeStationBudgetForMaxReach", () => {
  it("returns shares that sum to 1 and stay within budget", () => {
    const results = runSimulation(baseInput);
    const optimized = optimizeStationBudgetForMaxReach(
      baseInput,
      results.totalBudget,
      { chunks: 60, mode: "theoretical" },
    );
    expect(optimized).not.toBeNull();
    const shareSum = Object.values(optimized!.shares).reduce((a, b) => a + b, 0);
    expect(shareSum).toBeCloseTo(1, 6);
    expect(optimized!.totalBudget).toBe(Math.round(results.totalBudget));
    expect(optimized!.reachCount).toBeGreaterThan(0);
    expect(optimized!.mode).toBe("theoretical");
  });

  it("practical mode keeps every station above min budget share", () => {
    const results = runSimulation(baseInput);
    const optimized = optimizeStationBudgetForMaxReach(
      baseInput,
      results.totalBudget,
      { chunks: 80, mode: "practical" },
    );
    expect(optimized).not.toBeNull();
    const budgets = Object.values(optimized!.budgets);
    const total = budgets.reduce((a, b) => a + b, 0);
    expect(budgets).toHaveLength(4);
    for (const b of budgets) {
      expect(b / total).toBeGreaterThanOrEqual(
        optimized!.minBudgetShare - 0.02,
      );
      expect(b / total).toBeLessThanOrEqual(
        optimized!.maxBudgetShare + 0.02,
      );
    }
  });

  it("practical spreads more widely than theoretical on cost-skewed areas", () => {
    const results = runSimulation(baseInput);
    const theoretical = optimizeStationBudgetForMaxReach(
      baseInput,
      results.totalBudget,
      { chunks: 80, mode: "theoretical" },
    );
    const practical = optimizeStationBudgetForMaxReach(
      baseInput,
      results.totalBudget,
      { chunks: 80, mode: "practical" },
    );
    expect(theoretical).not.toBeNull();
    expect(practical).not.toBeNull();

    const countPositive = (budgets: Record<string, number>) =>
      Object.values(budgets).filter((b) => b > results.totalBudget * 0.05)
        .length;

    expect(countPositive(practical!.budgets)).toBeGreaterThanOrEqual(
      countPositive(theoretical!.budgets),
    );
    // 実務寄りは全局に最低配分がある
    expect(
      Object.values(practical!.budgets).every((b) => b > 0),
    ).toBe(true);
  });
});
