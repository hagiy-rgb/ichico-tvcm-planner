import { OPTIMIZER_DEFAULT_MAX_GRP } from "@/lib/constants/model-constants";

export type ReachPlanResult = {
  /** 目標リーチ率（0–1） */
  targetReachRate: number;
  /** 目標達成に必要なGRP（1GRP刻み）。到達不能なら null */
  requiredGrp: number | null;
  /** 必要出稿金額（円）。requiredGrp が取れない場合は null */
  requiredBudget: number | null;
  /** 現状リーチ率（0–1） */
  currentReachRate: number;
  /** 現状GRP */
  currentGrp: number;
  /** 必要GRP − 現状GRP */
  gapGrp: number | null;
  /** 必要金額 − 現状金額 */
  gapBudget: number | null;
};

/**
 * 目標リーチ率（0–1）を達成する最小GRPを1刻みで探索。
 * リーチはGRPに対して単調増加である前提。
 */
export function findGrpForTargetReach(params: {
  targetReachRate: number;
  reachRateAtGrp: (grp: number) => number;
  maxGrp?: number;
}): number | null {
  const target = params.targetReachRate;
  // 100%は漸近的に到達不能。0以下も無効。
  if (!(target > 0) || target >= 1) return null;

  const maxGrp = Math.max(1, Math.round(params.maxGrp ?? OPTIMIZER_DEFAULT_MAX_GRP));
  const atMax = params.reachRateAtGrp(maxGrp);
  if (!(atMax >= target)) return null;

  let lo = 0;
  let hi = maxGrp;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const rate = params.reachRateAtGrp(mid);
    if (rate >= target) hi = mid;
    else lo = mid + 1;
  }
  return lo > 0 ? lo : null;
}

export function buildReachPlan(params: {
  targetReachRatePercent: number;
  currentGrp: number;
  currentReachRate: number;
  perCost: number;
  reachRateAtGrp: (grp: number) => number;
  maxGrp?: number;
}): ReachPlanResult {
  const targetReachRate = Math.min(
    1,
    Math.max(0, params.targetReachRatePercent / 100),
  );
  const requiredGrp = findGrpForTargetReach({
    targetReachRate,
    reachRateAtGrp: params.reachRateAtGrp,
    maxGrp: params.maxGrp,
  });
  const requiredBudget =
    requiredGrp != null && params.perCost > 0
      ? requiredGrp * params.perCost
      : null;
  const gapGrp =
    requiredGrp != null ? requiredGrp - params.currentGrp : null;
  const gapBudget =
    requiredBudget != null
      ? requiredBudget - params.currentGrp * params.perCost
      : null;

  return {
    targetReachRate,
    requiredGrp,
    requiredBudget,
    currentReachRate: params.currentReachRate,
    currentGrp: params.currentGrp,
    gapGrp,
    gapBudget,
  };
}
