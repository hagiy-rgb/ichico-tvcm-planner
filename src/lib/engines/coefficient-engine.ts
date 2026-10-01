import { getIndustryByCode } from "@/lib/masters/industry-master";
import { getIndustryCoefficients } from "@/lib/masters/load-json";
import type {
  AwarenessSaturationDefaults,
  IndustryCoefficientRange,
  ModelDefinition,
} from "@/types/master";

export type FunnelStage =
  | "awareness"
  | "interest"
  | "consideration"
  | "intent"
  | "purchase"
  | "loyalty";

export type SimulationCoefficients = {
  lambdaWeekly: number;
  alphaConversion: number;
  /** 最大到達認知率 MaxAwareness（%、0–100） */
  maxAwareness: number;
  /** 認知率の半飽和点 K（認知率が MaxAwareness の半分になる Adstock） */
  halfSaturationAdstock: number;
  kPoisson: number;
  effectiveFrequency: number;
};

function getModelDefinition(): ModelDefinition | undefined {
  return getIndustryCoefficients().model_definition as
    | ModelDefinition
    | undefined;
}

export function getAlphaConversionRange(): IndustryCoefficientRange {
  const range = getModelDefinition()?.alpha_conversion_default;
  if (!range) {
    throw new Error(
      "alpha_conversion_default が industry_coefficients.json に見つかりません",
    );
  }
  return range;
}

export function getAwarenessSaturationRanges(): AwarenessSaturationDefaults {
  const ranges = getModelDefinition()?.awareness_saturation_default;
  if (!ranges) {
    throw new Error(
      "awareness_saturation_default が industry_coefficients.json に見つかりません",
    );
  }
  return ranges;
}

export type CoefficientWarning = {
  field: keyof SimulationCoefficients;
  message: string;
};

const FUNNEL_LABELS: Record<FunnelStage, string> = {
  awareness: "認知",
  interest: "興味",
  consideration: "比較検討",
  intent: "購買意向",
  purchase: "購買",
  loyalty: "ロイヤリティ",
};

export function listFunnelStages(): Array<{ id: FunnelStage; label: string }> {
  return (Object.keys(FUNNEL_LABELS) as FunnelStage[]).map((id) => ({
    id,
    label: FUNNEL_LABELS[id],
  }));
}

export function getFunnelMultiplier(stage: FunnelStage): {
  multiplier: number;
  source: string;
  quality: string;
} {
  const industry = getIndustryCoefficients() as {
    funnel_multipliers_for_lambda?: Record<string, number | string>;
  };
  const table = industry.funnel_multipliers_for_lambda;
  if (!table || typeof table[stage] !== "number") {
    return { multiplier: 1, source: "", quality: "" };
  }
  return {
    multiplier: table[stage] as number,
    source: String(table.source ?? ""),
    quality: String(table.quality ?? ""),
  };
}

export function halfLifeWeeks(lambdaWeekly: number): number | null {
  if (lambdaWeekly <= 0 || lambdaWeekly >= 1) {
    return null;
  }
  return Math.log(0.5) / Math.log(lambdaWeekly);
}

export function buildRecommendedCoefficients(
  industryCode: string,
  funnelStage: FunnelStage,
): SimulationCoefficients {
  const industry = getIndustryByCode(industryCode);
  if (!industry) {
    throw new Error(`業界マスタが見つかりません: ${industryCode}`);
  }

  const funnel = getFunnelMultiplier(funnelStage);
  const lambdaWeekly = industry.lambda_weekly.typical * funnel.multiplier;

  const alphaConversion = getAlphaConversionRange().typical;
  const saturation = getAwarenessSaturationRanges();

  return {
    lambdaWeekly,
    alphaConversion,
    maxAwareness: saturation.max_awareness.typical,
    halfSaturationAdstock: saturation.half_saturation_adstock.typical,
    kPoisson: industry.k_poisson.value,
    effectiveFrequency: 6,
  };
}

export function validateCoefficients(
  coefficients: SimulationCoefficients,
  ranges: {
    lambda: IndustryCoefficientRange;
  },
): CoefficientWarning[] {
  const warnings: CoefficientWarning[] = [];

  if (coefficients.lambdaWeekly > 0.95) {
    warnings.push({
      field: "lambdaWeekly",
      message:
        "λが0.95を超えています。半減期が長くなりROIを過大評価する恐れがあります（マスタ注記参照）。",
    });
  }
  if (
    coefficients.lambdaWeekly < ranges.lambda.min ||
    coefficients.lambdaWeekly > ranges.lambda.max
  ) {
    warnings.push({
      field: "lambdaWeekly",
      message: `λは業界目安 ${ranges.lambda.min}〜${ranges.lambda.max} の範囲外です。`,
    });
  }
  const saturation = getAwarenessSaturationRanges();
  if (coefficients.maxAwareness <= 0 || coefficients.maxAwareness > 100) {
    warnings.push({
      field: "maxAwareness",
      message: "最大到達認知率 MaxAwareness は 0% より大きく 100% 以下にしてください。",
    });
  } else if (
    coefficients.maxAwareness < saturation.max_awareness.min ||
    coefficients.maxAwareness > saturation.max_awareness.max
  ) {
    warnings.push({
      field: "maxAwareness",
      message: `MaxAwareness は目安 ${saturation.max_awareness.min}〜${saturation.max_awareness.max}% の範囲外です。`,
    });
  }
  if (coefficients.halfSaturationAdstock <= 0) {
    warnings.push({
      field: "halfSaturationAdstock",
      message: "半飽和点 K は 0 より大きい値にしてください。",
    });
  } else if (
    coefficients.halfSaturationAdstock < saturation.half_saturation_adstock.min ||
    coefficients.halfSaturationAdstock > saturation.half_saturation_adstock.max
  ) {
    warnings.push({
      field: "halfSaturationAdstock",
      message: `半飽和点 K は目安 ${saturation.half_saturation_adstock.min}〜${saturation.half_saturation_adstock.max} の範囲外です。`,
    });
  }
  if (coefficients.effectiveFrequency < 1) {
    warnings.push({
      field: "effectiveFrequency",
      message: "有効フリークエンシー F は1以上にしてください。",
    });
  }

  const alphaConvRange = getAlphaConversionRange();
  if (
    coefficients.alphaConversion < alphaConvRange.min ||
    coefficients.alphaConversion > alphaConvRange.max
  ) {
    warnings.push({
      field: "alphaConversion",
      message: `即時効果係数αは目安 ${alphaConvRange.min}〜${alphaConvRange.max} の範囲外です。`,
    });
  }

  return warnings;
}

export function isQualityC(quality: string): boolean {
  return quality.trim() === "C" || quality.includes("C");
}
