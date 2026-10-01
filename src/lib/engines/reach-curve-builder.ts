import { reachCurveGrpMax } from "@/lib/engines/reach-curve-chart-utils";
import type { SimulationInput, ReachCurvePoint } from "@/types/simulation";
import {
  reachAtInputGrp,
  resolveReachContext,
  type ReachContext,
  type RunSimulationOptions,
} from "./reach-context";

const CURVE_GRP_STEPS = [0, 25, 50, 75, 100, 125, 150, 175, 200, 250, 300];

export { reachCurveGrpMax, REACH_CURVE_GRP_HEADROOM } from "@/lib/engines/reach-curve-chart-utils";

function buildCurveGrps(inputGrp: number): number[] {
  const maxGrp = reachCurveGrpMax(inputGrp);
  const grps = new Set<number>([0]);

  for (const g of CURVE_GRP_STEPS) {
    if (g <= maxGrp) grps.add(g);
  }

  if (inputGrp > 0 && inputGrp <= maxGrp) {
    grps.add(inputGrp);
  }

  for (let g = 350; g <= maxGrp; g += 50) {
    grps.add(g);
  }

  if (maxGrp > 300 && !grps.has(maxGrp)) {
    grps.add(maxGrp);
  }

  return Array.from(grps).sort((a, b) => a - b);
}

export type TargetReachCurveSeries = {
  target: string;
  points: ReachCurvePoint[];
};

/** 解決済みのリーチ前提からカーブを生成（本計算と同じ局合成・実効GRP・加重パーコスト） */
export function buildReachCurveFromContext(
  ctx: ReachContext,
  inputGrp: number,
): ReachCurvePoint[] {
  return buildCurveGrps(inputGrp).map((grp) => {
    const stationReach = reachAtInputGrp(ctx, grp);
    // 内部単位は小数(0–1)。リーチ単価(円/%)の分母のみ百分率に換算する
    const reachRate = stationReach.combinedReachRate;
    const reachRatePercent = reachRate * 100;
    const pointBudget = grp * ctx.perCost;
    const reachUnitPrice =
      reachRatePercent > 0
        ? pointBudget / reachRatePercent
        : Number.POSITIVE_INFINITY;
    const reachCount = stationReach.combinedReachCount;
    const reachPersonUnitPrice =
      reachCount > 0 ? pointBudget / reachCount : Number.POSITIVE_INFINITY;
    return {
      grp,
      reachRate,
      reachCount,
      reachUnitPrice,
      reachPersonUnitPrice,
    };
  });
}

export function buildReachCurveForTarget(
  input: SimulationInput,
  target: string,
  options: RunSimulationOptions = {},
): ReachCurvePoint[] {
  return buildReachCurveFromContext(
    resolveReachContext(input, options, target),
    input.grp,
  );
}

export function buildReachCurvesForTargets(
  input: SimulationInput,
  targets: string[],
  options: RunSimulationOptions = {},
): TargetReachCurveSeries[] {
  return targets.map((target) => ({
    target,
    points: buildReachCurveForTarget(input, target, options),
  }));
}
