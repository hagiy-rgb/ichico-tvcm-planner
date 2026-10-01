import { describe, expect, it } from "vitest";
import { buildRecommendedCoefficients } from "./coefficient-engine";
import { getPresetBlocks } from "./creative-pattern-engine";
import {
  buildReachCurveForTarget,
  buildReachCurvesForTargets,
  reachCurveGrpMax,
} from "./reach-curve-builder";
import { listTargetsForArea } from "@/lib/masters/area-master";
import type { SimulationInput } from "@/types/simulation";

const baseInput: SimulationInput = {
  area: "宮城",
  target: "個人全体",
  industryCode: "FMCG_FOOD",
  creativePattern: {
    presetName: "ヨの字",
    blocks: getPresetBlocks("ヨの字"),
  },
  coefficients: buildRecommendedCoefficients("FMCG_FOOD", "awareness"),
  funnelStage: "awareness",
  grp: 300,
  campaignWeeks: 4,
  grpDistribution: "even",
  selectedStations: ["TBC", "OXTV", "MMT", "KHB"],
  cmLength: 30,
};

describe("reach-curve-builder", () => {
  it("keeps reachRate in decimal (0-1) units", () => {
    const points = buildReachCurveForTarget(baseInput, "個人全体");
    for (const p of points) {
      expect(p.reachRate).toBeGreaterThanOrEqual(0);
      expect(p.reachRate).toBeLessThanOrEqual(1);
    }
    const last = points[points.length - 1];
    expect(last.reachRate).toBeGreaterThan(0);
  });

  it("is monotonically non-decreasing in reach", () => {
    const points = buildReachCurveForTarget(baseInput, "個人全体");
    for (let i = 1; i < points.length; i++) {
      expect(points[i].reachRate).toBeGreaterThanOrEqual(
        points[i - 1].reachRate,
      );
    }
  });

  it("extends GRP axis to input + headroom", () => {
    const points = buildReachCurveForTarget(baseInput, "個人全体");
    const maxGrp = Math.max(...points.map((p) => p.grp));
    expect(maxGrp).toBe(reachCurveGrpMax(baseInput.grp));
  });

  it("computes reach unit price in yen per percent", () => {
    const points = buildReachCurveForTarget(baseInput, "個人全体");
    const point = points.find((p) => p.grp === baseInput.grp);
    expect(point).toBeDefined();
    expect(point!.reachUnitPrice).toBeGreaterThan(0);
    expect(Number.isFinite(point!.reachUnitPrice)).toBe(true);
    // grp=0 の点は Infinity（リーチ0のため単価が定義できない）
    const zero = points.find((p) => p.grp === 0);
    expect(zero!.reachUnitPrice).toBe(Number.POSITIVE_INFINITY);
  });

  it("builds curves for multiple targets", () => {
    const targets = listTargetsForArea("宮城").slice(0, 2);
    expect(targets.length).toBeGreaterThan(1);
    const series = buildReachCurvesForTargets(baseInput, targets);
    expect(series).toHaveLength(2);
    expect(series[0].target).toBe(targets[0]);
    expect(series[1].points.length).toBeGreaterThan(3);
  });
});
