import { describe, expect, it } from "vitest";
import type { DaypartsData } from "@/types/dayparts";
import { buildRecommendedCoefficients } from "./coefficient-engine";
import { getPresetBlocks } from "./creative-pattern-engine";
import { runSimulation } from "./simulation-engine";

const allDays = (value: number) => ({
  月: value,
  火: value,
  水: value,
  木: value,
  金: value,
  土: value,
  日: value,
});

const daypartsFixture: DaypartsData = {
  id: "fixture",
  area: "宮城",
  periodStart: "2026-01-01",
  periodEnd: "2026-03-31",
  sampleSize: 200,
  timeSlotUnit: 60,
  ratingType: "個人",
  importedAt: "2026-01-01T00:00:00.000Z",
  fileName: "fixture.xlsx",
  sheets: [
    {
      target: "個人全体",
      blocks: [
        {
          station: "TBC",
          stationNormalized: "TBC",
          ratings: { "07:00": allDays(8), "14:00": allDays(2) },
        },
      ],
    },
  ],
  unmappedStations: [],
};

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
      grpDistribution: "even",
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

  it("runs for 東京 with cost-area alias", () => {
    const stations = ["NTV", "EX", "TBS", "TX"];
    const result = runSimulation({
      area: "東京",
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
      grpDistribution: "even",
      selectedStations: stations,
      cmLength: 30,
    });
    expect(result.reachRate).toBeGreaterThan(0);
    expect(result.awarenessCurve.length).toBe(4);
  });

  it("feeds the dayparts k into the reach curve (curve at input GRP = main reach)", () => {
    const input = {
      area: "宮城",
      target: "個人全体",
      industryCode: "FMCG_FOOD",
      creativePattern: {
        presetName: "ヨの字" as const,
        blocks: getPresetBlocks("ヨの字"),
      },
      coefficients: buildRecommendedCoefficients("FMCG_FOOD", "awareness"),
      funnelStage: "awareness" as const,
      grp: 100,
      campaignWeeks: 4,
      grpDistribution: "even" as const,
      selectedStations: ["TBC"],
      cmLength: 30 as const,
    };
    const plain = runSimulation(input);
    const precise = runSimulation(input, { dayparts: daypartsFixture });
    expect(precise.kPatternSource).toBe("dayparts");
    expect(
      Math.abs(precise.kPatternCoefficient - plain.kPatternCoefficient),
    ).toBeGreaterThan(0.05);
    for (const result of [plain, precise]) {
      const atInput = result.reachCurve.find((p) => p.grp === input.grp)!;
      expect(atInput.reachRate).toBeCloseTo(result.reachRate, 12);
    }
  });

  it("reports cost per thousand reached in the same basis as the main budget", () => {
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
      grp: 800,
      campaignWeeks: 4,
      grpDistribution: "even",
      selectedStations: ["TBC", "OXTV", "MMT", "KHB"],
      cmLength: 30,
    });
    expect(result.reachCount).toBeGreaterThan(0);
    expect(result.costPerThousandReached).toBeCloseTo(
      result.totalBudget / (result.reachCount / 1000),
      6,
    );
    expect(result.optimalGrp.marginalPeakGrp).not.toBeNull();
    if (result.optimalGrp.marginalEfficiencyGrp != null) {
      expect(result.optimalGrp.marginalEfficiencyGrp).toBeGreaterThan(
        result.optimalGrp.marginalPeakGrp!,
      );
    }
  });

  it("sums the budget per station (Σ station GRP × station per-cost)", () => {
    const input = {
      area: "宮城",
      target: "個人全体",
      industryCode: "FMCG_FOOD",
      creativePattern: {
        presetName: "ヨの字" as const,
        blocks: getPresetBlocks("ヨの字"),
      },
      coefficients: buildRecommendedCoefficients("FMCG_FOOD", "awareness"),
      funnelStage: "awareness" as const,
      grp: 120,
      campaignWeeks: 4,
      grpDistribution: "even" as const,
      selectedStations: ["TBC", "KHB"],
      stationPerCosts: { TBC: 9000, KHB: 3000 },
      cmLength: 30 as const,
    };
    for (const stationGrpAllocation of ["cost_weighted", "equal"] as const) {
      const result = runSimulation({ ...input, stationGrpAllocation });
      const perStation = result.stationReachRows.reduce(
        (sum, row) => sum + input.grp * row.grpShare * row.perCost,
        0,
      );
      expect(result.totalBudget).toBeCloseTo(perStation, 6);
      expect(result.stationGrpAllocation).toBe(stationGrpAllocation);
    }
    const weighted = runSimulation({ ...input, stationGrpAllocation: "cost_weighted" });
    const equal = runSimulation({ ...input, stationGrpAllocation: "equal" });
    // 安い局に厚く配分するぶん、同じ総GRPでも予算は均等より小さい
    expect(weighted.totalBudget).toBeLessThan(equal.totalBudget);
    expect(equal.totalBudget).toBeCloseTo(120 * 6000, 6);
    expect(weighted.totalBudget).toBeCloseTo(120 * 4500, 6);
  });

  it("changes reach and budget when CM length changes", () => {
    const base = {
      area: "宮城",
      target: "個人全体",
      industryCode: "FMCG_FOOD",
      creativePattern: {
        presetName: "ヨの字" as const,
        blocks: getPresetBlocks("ヨの字"),
      },
      coefficients: buildRecommendedCoefficients("FMCG_FOOD", "awareness"),
      funnelStage: "awareness" as const,
      grp: 100,
      campaignWeeks: 4,
      grpDistribution: "even" as const,
      selectedStations: ["TBC", "OXTV", "MMT", "KHB"],
    };
    const s30 = runSimulation({ ...base, cmLength: 30 });
    const s15 = runSimulation({ ...base, cmLength: 15 });
    const s60 = runSimulation({ ...base, cmLength: 60 });
    expect(s15.reachRate).toBeGreaterThan(s30.reachRate);
    expect(s60.reachRate).toBeLessThan(s30.reachRate);
    expect(s60.totalBudget).toBeGreaterThan(s30.totalBudget);
    expect(s15.totalBudget).toBeLessThan(s30.totalBudget);
  });
});
