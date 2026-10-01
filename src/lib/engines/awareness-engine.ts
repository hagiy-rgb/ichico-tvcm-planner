import {
  AWARENESS_RAMP_ZONE_MAX_RATIO,
  AWARENESS_SATURATED_ZONE_MIN_RATIO,
} from "@/lib/constants/model-constants";
import {
  periodLabel,
  WEEKS_PER_MONTH,
  type GrpDistributionPreset,
  type PlanningGranularity,
} from "@/lib/engines/grp-schedule";

/** @deprecated 互換用 */
export type GrpAllocation = GrpDistributionPreset | "lump_sum" | "even_weekly";

export type AwarenessInput = {
  /** 期間別GRP（入力GRP単位。長さ＝期間数） */
  periodGrp: number[];
  granularity: PlanningGranularity;
  /** 入力GRP → 実効GRP（CM秒数換算）の倍率。省略時 1 */
  effectiveGrpMultiplier?: number;
  /** 週次の残存係数 λ_w（内部基準） */
  lambdaWeekly: number;
  alphaConversion: number;
  maxAwareness: number;
  halfSaturationAdstock: number;
  patternCoefficient: number;
};

export type AwarenessCurvePoint = {
  /** 期間番号（1始まり） */
  period: number;
  /** 「第n週」「第n月」 */
  periodLabel: string;
  /** その期間の投下GRP（入力GRP単位） */
  grp: number;
  /** その期間の実効GRP（CM秒数換算後。Adstock投入量の基準） */
  effectiveGrp: number;
  adstock: number;
  awarenessRate: number;
};

/**
 * 飽和曲線上の位置
 * - ramp: 立ち上がり域（K の誤差が効きやすい）
 * - effective: 妥当帯
 * - saturated: 飽和域（追加GRPの認知寄与が小さい）
 */
export type AwarenessZone = "ramp" | "effective" | "saturated";

export type AwarenessResult = {
  awarenessRate: number;
  finalAdstock: number;
  awarenessCurve: AwarenessCurvePoint[];
  /** 最終認知率 / MaxAwareness（0–1） */
  saturationRatio: number;
  zone: AwarenessZone;
  granularity: PlanningGranularity;
  /** 1期間あたりの残存係数（週次 λ_w、月次 λ_m = λ_w^4.345） */
  lambdaPeriod: number;
  /** 当期効果の期間換算係数（週次 1、月次は期間内減衰の補正） */
  periodImpactFactor: number;
};

/** 1期間の長さ（週） */
export function weeksPerPeriod(granularity: PlanningGranularity): number {
  return granularity === "month" ? WEEKS_PER_MONTH : 1;
}

function clampLambda(lambdaWeekly: number): number {
  return Math.min(1, Math.max(0, lambdaWeekly));
}

/** n週を1期間とした残存係数 λ_w^n */
export function lambdaForWeeks(lambdaWeekly: number, weeks: number): number {
  return clampLambda(lambdaWeekly) ** weeks;
}

/** 期間粒度の残存係数: λ_period = λ_w ^ (期間の週数)。月次は λ_m = λ_w^4.345 */
export function lambdaForGranularity(
  lambdaWeekly: number,
  granularity: PlanningGranularity,
): number {
  return lambdaForWeeks(lambdaWeekly, weeksPerPeriod(granularity));
}

/**
 * n週を1期間としたときの当期効果の換算係数（時間集計バイアスの補正）。
 *
 * 期間内（n週）に均等投下した週次Koyckを期間末で見ると
 *   Adstock_end = λ_w^n × Adstock_prev + α × (GRP_period / n) × Σ_{j=0}^{n-1} λ_w^j
 * となるため、期間1ステップの当期効果は α × (1 − λ_w^n) / (n × (1 − λ_w)) に相当する。
 * これにより期間末Adstockは週次シミュレーションの期間末値と一致し、
 * 定常状態の認知水準も粒度に依存しない。
 */
export function impactFactorForWeeks(lambdaWeekly: number, weeks: number): number {
  if (weeks === 1) return 1;
  const lambda = clampLambda(lambdaWeekly);
  if (1 - lambda < 1e-9) return 1;
  return (1 - lambda ** weeks) / (weeks * (1 - lambda));
}

export function periodImpactFactor(
  lambdaWeekly: number,
  granularity: PlanningGranularity,
): number {
  return impactFactorForWeeks(lambdaWeekly, weeksPerPeriod(granularity));
}

/**
 * Koyck型アドストック（期間単位で1ステップ）
 * Adstock_t = α × GRP_t × 絵柄補正 + λ × Adstock_(t-1)
 */
export function iterateAdstock(
  periodGrp: number[],
  lambda: number,
  alphaConversion: number,
  patternCoefficient: number,
): number[] {
  const series: number[] = [];
  let previous = 0;

  for (const grp of periodGrp) {
    const adstock = alphaConversion * grp * patternCoefficient + lambda * previous;
    series.push(adstock);
    previous = adstock;
  }

  return series;
}

/** @deprecated iterateAdstock を使用 */
export const iterateWeeklyAdstock = iterateAdstock;

/**
 * 飽和式（Michaelis–Menten型）: 認知率[%] = MaxAwareness × Adstock / (Adstock + K)
 * Adstock→∞ で MaxAwareness に漸近し、Adstock = K で MaxAwareness の半分になる。
 */
export function awarenessPercentFromAdstock(
  adstock: number,
  maxAwareness: number,
  halfSaturationAdstock: number,
): number {
  if (adstock <= 0) {
    return 0;
  }
  const maxA = Math.min(100, Math.max(0, maxAwareness));
  const k = Math.max(Number.EPSILON, halfSaturationAdstock);
  return (maxA * adstock) / (adstock + k);
}

export function classifyAwarenessZone(saturationRatio: number): AwarenessZone {
  if (saturationRatio >= AWARENESS_SATURATED_ZONE_MIN_RATIO) {
    return "saturated";
  }
  if (saturationRatio < AWARENESS_RAMP_ZONE_MAX_RATIO) {
    return "ramp";
  }
  return "effective";
}

export function calculateAwareness(input: AwarenessInput): AwarenessResult {
  const multiplier = input.effectiveGrpMultiplier ?? 1;
  const effectiveGrp = input.periodGrp.map((grp) => grp * multiplier);
  const lambdaPeriod = lambdaForGranularity(
    input.lambdaWeekly,
    input.granularity,
  );
  const impactFactor = periodImpactFactor(
    input.lambdaWeekly,
    input.granularity,
  );
  const adstockSeries = iterateAdstock(
    effectiveGrp,
    lambdaPeriod,
    input.alphaConversion * impactFactor,
    input.patternCoefficient,
  );

  const awarenessCurve: AwarenessCurvePoint[] = adstockSeries.map(
    (adstock, index) => ({
      period: index + 1,
      periodLabel: periodLabel(index, input.granularity),
      grp: input.periodGrp[index] ?? 0,
      effectiveGrp: effectiveGrp[index] ?? 0,
      adstock,
      awarenessRate: awarenessPercentFromAdstock(
        adstock,
        input.maxAwareness,
        input.halfSaturationAdstock,
      ),
    }),
  );

  const finalAdstock = adstockSeries[adstockSeries.length - 1] ?? 0;
  const awarenessRate = awarenessPercentFromAdstock(
    finalAdstock,
    input.maxAwareness,
    input.halfSaturationAdstock,
  );
  const saturationRatio =
    input.maxAwareness > 0 ? awarenessRate / Math.min(100, input.maxAwareness) : 0;

  return {
    awarenessRate,
    finalAdstock,
    awarenessCurve,
    saturationRatio,
    zone: classifyAwarenessZone(saturationRatio),
    granularity: input.granularity,
    lambdaPeriod,
    periodImpactFactor: impactFactor,
  };
}
