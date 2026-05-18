import { getIndustryByCode } from "@/lib/masters/industry-master";
import { getIndustryCoefficients } from "@/lib/masters/load-json";
import type {
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
  alphaAwareness: number;
  kPoisson: number;
  effectiveFrequency: number;
};

export function getAlphaConversionRange(): IndustryCoefficientRange {
  const model = getIndustryCoefficients().model_definition as
    | ModelDefinition
    | undefined;
  const range = model?.alpha_conversion_default;
  if (!range) {
    throw new Error(
      "alpha_conversion_default が industry_coefficients.json に見つかりません",
    );
  }
  return range;
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

  return {
    lambdaWeekly,
    alphaConversion,
    alphaAwareness: industry.alpha_awareness.typical,
    kPoisson: industry.k_poisson.value,
    effectiveFrequency: 6,
  };
}

export function validateCoefficients(
  coefficients: SimulationCoefficients,
  ranges: {
    lambda: IndustryCoefficientRange;
    alphaAwareness: IndustryCoefficientRange;
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
  if (
    coefficients.alphaAwareness < ranges.alphaAwareness.min ||
    coefficients.alphaAwareness > ranges.alphaAwareness.max
  ) {
    warnings.push({
      field: "alphaAwareness",
      message: `認知変換率αは業界目安 ${ranges.alphaAwareness.min}〜${ranges.alphaAwareness.max} の範囲外です。`,
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
