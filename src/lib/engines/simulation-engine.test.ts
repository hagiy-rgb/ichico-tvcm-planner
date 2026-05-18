import { describe, expect, it } from "vitest";
import { buildRecommendedCoefficients } from "./coefficient-engine";
import { getPresetBlocks } from "./creative-pattern-engine";
import { runSimulation } from "./simulation-engine";

describe("simulation-engine", () => {
  it("runs full simulation for 宮城・個人全体", () => {
    const result = runSimulation({
      area: "宮城",
      target: "個人全体",
      industryCode: "FMCG_FOOD",
      creativePattern: {
        presetName: "ヨの字",
        blocks: getPresetBlocks("ヨの字"),
      },
      coefficients: buildRecommendedCoefficients("FMCG_FOOD", "awareness"),
      funnelStage: "awareness",
      grp: 100,
      campaignWeeks: 4,
      grpAllocation: "even_weekly",
      selectedStations: ["TBC", "OXTV", "MMT", "KHB"],
      cmLength: 30,
    });

    expect(result.population).toBe(2_249_000);
    expect(result.awarenessRate).toBeGreaterThan(0);
    expect(result.awarenessCurve).toHaveLength(4);
    expect(result.perCost).toBeGreaterThan(0);
    expect(result.totalBudget).toBeCloseTo(100 * result.perCost, 0);
    expect(result.reachCurve.length).toBeGreaterThan(3);
    expect(result.reachRate).toBeGreaterThan(0);
  });
});
