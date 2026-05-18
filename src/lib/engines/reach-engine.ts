import { poissonCDF } from "@/lib/utils/poisson";

export type ReachInput = {
  /** 視聴人口（人） */
  population: number;
  grp: number;
  /** 有効フリークエンシー閾値 F（デフォルト6） */
  effectiveFrequency: number;
  /** CM効果係数 k（1GRPあたりの平均接触回数係数） */
  cmCoefficient: number;
  /** 絵柄補正などを含む有効 k（省略時は cmCoefficient のみ） */
  effectiveCoefficient?: number;
};

export type ReachResult = {
  reachRate: number;
  reachCount: number;
  lambda: number;
  cumulativeBelowThreshold: number;
};

/**
 * ポアソン分布モデルによるリーチ計算
 * リーチ率 = 1 − POISSON_CDF(F−1, k_effective × GRP)
 */
export function calculateReach(input: ReachInput): ReachResult {
  const {
    population,
    grp,
    effectiveFrequency,
    cmCoefficient,
    effectiveCoefficient,
  } = input;

  if (population <= 0) {
    throw new Error("視聴人口は0より大きい必要があります");
  }
  if (grp < 0) {
    throw new Error("GRPは0以上である必要があります");
  }
  if (effectiveFrequency < 1) {
    throw new Error("有効フリークエンシーは1以上である必要があります");
  }

  const kEffective = effectiveCoefficient ?? cmCoefficient;
  const lambda = kEffective * grp;
  const x = effectiveFrequency - 1;
  const cumulativeBelowThreshold = poissonCDF(x, lambda);
  const reachRate = 1 - cumulativeBelowThreshold;
  const reachCount = Math.round(population * reachRate);

  return {
    reachRate,
    reachCount,
    lambda,
    cumulativeBelowThreshold,
  };
}

/** リーチ率を百分率表示用に変換 */
export function reachRateToPercent(reachRate: number): number {
  return reachRate * 100;
}
