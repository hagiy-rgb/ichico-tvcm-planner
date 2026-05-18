import { getMasterData } from "@/lib/masters/load-json";
import { calculateCost } from "./cost-engine";
import { calculateReach } from "./reach-engine";

export type OptimizerContext = {
  population: number;
  perCost: number;
  effectiveFrequency: number;
  kEffective: number;
  webVideoCpm?: number;
  maxGrp?: number;
};

export type OptimalGrpResult = {
  webParityGrp: number | null;
  marginalEfficiencyGrp: number | null;
  webVideoCpmUsed: number;
};

export function getDefaultWebVideoCpm(): number {
  const bench = getMasterData().planning_benchmarks?.web_video_cpm_yen;
  if (!bench) {
    throw new Error("web_video_cpm_yen が master_data.json に見つかりません");
  }
  return bench.value;
}

function reachUnitPriceAtGrp(ctx: OptimizerContext, grp: number): number {
  if (grp <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  const reach = calculateReach({
    population: ctx.population,
    grp,
    effectiveFrequency: ctx.effectiveFrequency,
    cmCoefficient: ctx.kEffective,
  });
  const cost = calculateCost({
    grp,
    perCost: ctx.perCost,
    population: ctx.population,
    reachRate: reach.reachRate,
  });
  return cost.reachUnitPrice;
}

function marginalReachEfficiency(ctx: OptimizerContext, grp: number): number {
  const delta = 1;
  const base = calculateReach({
    population: ctx.population,
    grp: Math.max(0, grp),
    effectiveFrequency: ctx.effectiveFrequency,
    cmCoefficient: ctx.kEffective,
  }).reachRate;
  const next = calculateReach({
    population: ctx.population,
    grp: grp + delta,
    effectiveFrequency: ctx.effectiveFrequency,
    cmCoefficient: ctx.kEffective,
  }).reachRate;
  return (next - base) / delta;
}

/**
 * 方式A: リーチ単価が web動画CPM ベンチマークに近づく GRP（二分探索）
 */
export function findWebParityGrp(ctx: OptimizerContext): number | null {
  const targetCpm = ctx.webVideoCpm ?? getDefaultWebVideoCpm();
  const maxGrp = ctx.maxGrp ?? 2000;
  let low = 1;
  let high = maxGrp;
  let bestGrp: number | null = null;
  let bestDiff = Number.POSITIVE_INFINITY;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const unitPrice = reachUnitPriceAtGrp(ctx, mid);
    if (!Number.isFinite(unitPrice)) {
      low = mid + 1;
      continue;
    }
    const diff = Math.abs(unitPrice - targetCpm);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestGrp = mid;
    }
    if (unitPrice > targetCpm) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return bestGrp;
}

/**
 * 方式B: 限界リーチ効率が初期効率の50%まで低下する GRP
 */
export function findMarginalEfficiencyGrp(ctx: OptimizerContext): number | null {
  const maxGrp = ctx.maxGrp ?? 2000;
  const initial = marginalReachEfficiency(ctx, 1);
  if (initial <= 0) {
    return null;
  }
  const threshold = initial * 0.5;

  for (let grp = 1; grp <= maxGrp; grp += 1) {
    const marginal = marginalReachEfficiency(ctx, grp);
    if (marginal <= threshold) {
      return grp;
    }
  }

  return maxGrp;
}

export function calculateOptimalGrp(ctx: OptimizerContext): OptimalGrpResult {
  const webVideoCpmUsed = ctx.webVideoCpm ?? getDefaultWebVideoCpm();
  return {
    webParityGrp: findWebParityGrp({ ...ctx, webVideoCpm: webVideoCpmUsed }),
    marginalEfficiencyGrp: findMarginalEfficiencyGrp(ctx),
    webVideoCpmUsed,
  };
}
