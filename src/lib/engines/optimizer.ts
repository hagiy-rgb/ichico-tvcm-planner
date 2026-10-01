import {
  MARGINAL_EFFICIENCY_RATIO,
  OPTIMIZER_DEFAULT_MAX_GRP,
} from "@/lib/constants/model-constants";
import { getMasterData } from "@/lib/masters/load-json";
import type { ReachCurvePoint } from "@/types/simulation";
import { calculateReach } from "./reach-engine";

export type OptimizerContext = {
  /**
   * 入力GRP → リーチ率（小数 0–1）。
   * 本計算と同じプリミティブ（局合成＋CM秒数の実効GRP換算）を渡すこと。
   */
  reachRateAtGrp: (grp: number) => number;
  /** リーチ人数換算の母数（人） */
  population: number;
  /** 入力GRPあたり出稿単価（円/GRP） */
  perCost: number;
  /** web動画ベンチマーク単価（円/1再生）。省略時はマスタ値 */
  webVideoCpm?: number;
  /** 探索上限GRP（1GRP刻み） */
  maxGrp?: number;
};

export type OptimalGrpResult = {
  /**
   * 方式A: TVのリーチ千人あたりコスト（円/千人）が
   * web動画の千再生あたりコスト（円/千再生）以下となる最小GRP。
   * パリティに達しない場合は null。
   */
  webParityGrp: number | null;
  /** 方式B: 限界リーチ効率がピークの50%まで低下したGRP（探索範囲内で未到達なら null） */
  marginalEfficiencyGrp: number | null;
  /** 方式Bの基準とした限界リーチ効率のピークGRP */
  marginalPeakGrp: number | null;
  /** ターゲットのリーチカーブ上でリーチ単価（円/%）が最小となるGRP */
  minReachUnitPriceGrp: number | null;
  minReachUnitPrice: number | null;
  /** 使用した webベンチマーク単価（円/1再生） */
  webVideoCpmUsed: number;
  /** 方式A・Bの探索上限GRP */
  searchMaxGrp: number;
};

export type MinReachUnitPriceOnCurve = {
  grp: number | null;
  reachUnitPrice: number | null;
};

/** 単一母集団のポアソンリーチ（局合成を使わない検証・テスト用） */
export function poissonReachRateAtGrp(params: {
  population: number;
  effectiveFrequency: number;
  kEffective: number;
}): (grp: number) => number {
  return (grp) =>
    calculateReach({
      population: params.population,
      grp: Math.max(0, grp),
      effectiveFrequency: params.effectiveFrequency,
      cmCoefficient: params.kEffective,
    }).reachRate;
}

/** リーチカーブ上の離散点からリーチ単価（円/%）が最小のポイントを選ぶ */
export function findMinReachUnitPriceOnCurve(
  points: ReachCurvePoint[],
): MinReachUnitPriceOnCurve {
  let best: ReachCurvePoint | null = null;

  for (const point of points) {
    if (point.grp <= 0) continue;
    const unit = point.reachUnitPrice;
    if (unit == null || !Number.isFinite(unit) || unit <= 0) continue;
    if (
      !best ||
      (best.reachUnitPrice ?? Number.POSITIVE_INFINITY) > unit
    ) {
      best = point;
    }
  }

  if (!best || best.reachUnitPrice == null) {
    return { grp: null, reachUnitPrice: null };
  }

  return { grp: best.grp, reachUnitPrice: best.reachUnitPrice };
}

export function getDefaultWebVideoCpm(): number {
  const bench = getMasterData().planning_benchmarks?.web_video_cpm_yen;
  if (!bench) {
    throw new Error("web_video_cpm_yen が master_data.json に見つかりません");
  }
  return bench.value;
}

function resolveMaxGrp(ctx: OptimizerContext): number {
  return Math.max(1, Math.round(ctx.maxGrp ?? OPTIMIZER_DEFAULT_MAX_GRP));
}

/** GRP = 0..maxGrp（1刻み）のリーチ率。方式A・Bで共有する */
function sampleReachRates(ctx: OptimizerContext, maxGrp: number): number[] {
  return Array.from({ length: maxGrp + 1 }, (_, grp) =>
    grp === 0 ? 0 : ctx.reachRateAtGrp(grp),
  );
}

function costPerThousandReached(
  ctx: OptimizerContext,
  grp: number,
  reachRate: number,
): number {
  if (grp <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  const reachCount = Math.round(ctx.population * reachRate);
  if (reachCount <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return (grp * ctx.perCost) / (reachCount / 1000);
}

/** リーチ千人あたりコスト（円/千人）。リーチ0なら +Infinity */
export function costPerThousandReachedAtGrp(
  ctx: OptimizerContext,
  grp: number,
): number {
  return costPerThousandReached(
    ctx,
    grp,
    grp > 0 ? ctx.reachRateAtGrp(grp) : 0,
  );
}

/**
 * 方式A: webコストパリティGRP
 *
 * 同一次元での比較:
 *   TV側   = 出稿総額 ÷ (リーチ人数/1000)  [円/リーチ千人]
 *   web側  = ベンチマーク単価(円/1再生) × 1000  [円/千再生]
 *
 * コスト/千人はGRPに対してU字型（低GRPは非効率→改善→飽和で再上昇）のため、
 * 二分探索ではなく線形走査で「パリティ以下になる最小GRP」を求める。
 * 到達しない場合は null（＝webの方が常に安い）。
 */
export function findWebParityGrp(
  ctx: OptimizerContext,
  reachRates: number[] = sampleReachRates(ctx, resolveMaxGrp(ctx)),
): number | null {
  const webCostPerView = ctx.webVideoCpm ?? getDefaultWebVideoCpm();
  const targetCostPerThousand = webCostPerView * 1000;

  for (let grp = 1; grp < reachRates.length; grp += 1) {
    const cost = costPerThousandReached(ctx, grp, reachRates[grp]);
    if (Number.isFinite(cost) && cost <= targetCostPerThousand) {
      return grp;
    }
  }

  return null;
}

export type MarginalEfficiencyResult = {
  grp: number | null;
  peakGrp: number | null;
};

/**
 * 方式B: 限界効率法
 *
 * 限界リーチ効率 m(g) = R(g+1) − R(g)。有効F≥2のポアソンでは m(g) は
 * 低GRPで0付近から立ち上がり、ピークを経て逓減する（S字カーブの傾き）。
 * GRP=1の値を基準にすると基準がほぼ0になり実質「探索上限」を返してしまうため、
 * ピーク値を基準に「ピーク以降で50%まで低下した最初のGRP」を返す。
 */
export function findMarginalEfficiency(
  ctx: OptimizerContext,
  reachRates: number[] = sampleReachRates(ctx, resolveMaxGrp(ctx)),
): MarginalEfficiencyResult {
  const marginal: number[] = [];
  for (let grp = 0; grp + 1 < reachRates.length; grp += 1) {
    marginal.push(reachRates[grp + 1] - reachRates[grp]);
  }

  let peakGrp = -1;
  let peak = 0;
  for (let grp = 0; grp < marginal.length; grp += 1) {
    if (marginal[grp] > peak) {
      peak = marginal[grp];
      peakGrp = grp;
    }
  }
  if (peakGrp < 0 || peak <= 0) {
    return { grp: null, peakGrp: null };
  }

  const threshold = peak * MARGINAL_EFFICIENCY_RATIO;
  for (let grp = peakGrp + 1; grp < marginal.length; grp += 1) {
    if (marginal[grp] <= threshold) {
      return { grp, peakGrp };
    }
  }

  return { grp: null, peakGrp };
}

export function findMarginalEfficiencyGrp(ctx: OptimizerContext): number | null {
  return findMarginalEfficiency(ctx).grp;
}

export function calculateOptimalGrp(
  ctx: OptimizerContext,
  reachCurve?: ReachCurvePoint[],
): OptimalGrpResult {
  const webVideoCpmUsed = ctx.webVideoCpm ?? getDefaultWebVideoCpm();
  const searchMaxGrp = resolveMaxGrp(ctx);
  const reachRates = sampleReachRates(ctx, searchMaxGrp);
  const marginal = findMarginalEfficiency(ctx, reachRates);
  const minOnCurve = reachCurve
    ? findMinReachUnitPriceOnCurve(reachCurve)
    : { grp: null, reachUnitPrice: null };

  return {
    webParityGrp: findWebParityGrp(
      { ...ctx, webVideoCpm: webVideoCpmUsed },
      reachRates,
    ),
    marginalEfficiencyGrp: marginal.grp,
    marginalPeakGrp: marginal.peakGrp,
    minReachUnitPriceGrp: minOnCurve.grp,
    minReachUnitPrice: minOnCurve.reachUnitPrice,
    webVideoCpmUsed,
    searchMaxGrp,
  };
}
