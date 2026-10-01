import { describe, expect, it } from "vitest";
import { buildRecommendedCoefficients } from "./coefficient-engine";
import { getPresetBlocks } from "./creative-pattern-engine";
import { buildLeverageAnalysis, runReachTornado } from "./sensitivity-engine";
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
  grp: 100,
  campaignWeeks: 4,
  grpDistribution: "even" as const,
  selectedStations: ["TBC", "OXTV", "MMT", "KHB"],
  cmLength: 30 as const,
};

describe("sensitivity-engine", () => {
  it("builds tornado rows sorted by impact", () => {
    const results = runSimulation(baseInput);
    const tornado = runReachTornado(baseInput, results);
    expect(tornado.length).toBeGreaterThan(0);
    for (let i = 1; i < tornado.length; i++) {
      const prevSpan = Math.abs(tornado[i - 1].high - tornado[i - 1].low);
      const span = Math.abs(tornado[i].high - tornado[i].low);
      expect(prevSpan).toBeGreaterThanOrEqual(span);
    }
  });

  it("builds full leverage analysis with improvement story", () => {
    const results = runSimulation(baseInput);
    const analysis = buildLeverageAnalysis(baseInput, results);
    expect(analysis.waterfall.length).toBeGreaterThan(2);
    expect(analysis.insights.length).toBeGreaterThan(0);
    expect(analysis.improvementStory.length).toBeGreaterThan(20);
  });

  it("keeps waterfall totals consistent (全日 + 絵柄差分 = 現在プラン)", () => {
    const results = runSimulation(baseInput);
    const analysis = buildLeverageAnalysis(baseInput, results);
    const allDay = analysis.waterfall.find((r) => r.name === "全日ベース");
    const current = analysis.waterfall.find((r) => r.name === "現在プラン");
    const pattern = analysis.waterfall.find((r) => r.name.startsWith("絵柄"));
    expect(allDay).toBeDefined();
    expect(current).toBeDefined();
    expect(pattern).toBeDefined();
    expect(allDay!.delta + pattern!.delta).toBeCloseTo(current!.total, 5);
    expect(current!.delta).toBeCloseTo(current!.total, 5);
  });
});
