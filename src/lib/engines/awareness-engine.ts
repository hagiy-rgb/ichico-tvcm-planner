export type GrpAllocation = "lump_sum" | "even_weekly";

export type AwarenessInput = {
  totalGrp: number;
  campaignWeeks: number;
  grpAllocation: GrpAllocation;
  lambdaWeekly: number;
  alphaConversion: number;
  alphaAwareness: number;
  patternCoefficient: number;
};

export type AwarenessCurvePoint = {
  week: number;
  grp: number;
  adstock: number;
  awarenessRate: number;
};

export type AwarenessResult = {
  awarenessRate: number;
  finalAdstock: number;
  awarenessCurve: AwarenessCurvePoint[];
  linearApproxWarning: boolean;
  saturated: boolean;
};

const LINEAR_GRP_MIN = 500;
const LINEAR_GRP_MAX = 1500;

export function buildWeeklyGrpSchedule(
  totalGrp: number,
  campaignWeeks: number,
  allocation: GrpAllocation,
): number[] {
  const weeks = Math.max(1, Math.round(campaignWeeks));
  if (allocation === "lump_sum") {
    return Array.from({ length: weeks }, (_, index) =>
      index === 0 ? totalGrp : 0,
    );
  }

  const perWeek = totalGrp / weeks;
  return Array.from({ length: weeks }, () => perWeek);
}

/**
 * Koyck型アドストック（週次）
 * Adstock_t = α × GRP_t × 絵柄補正 + λ × Adstock_(t-1)
 */
export function iterateWeeklyAdstock(
  weeklyGrp: number[],
  lambdaWeekly: number,
  alphaConversion: number,
  patternCoefficient: number,
): number[] {
  const series: number[] = [];
  let previous = 0;

  for (const grp of weeklyGrp) {
    const adstock =
      alphaConversion * grp * patternCoefficient + lambdaWeekly * previous;
    series.push(adstock);
    previous = adstock;
  }

  return series;
}

/** 線形近似: 認知率[%] = α_awareness × Adstock */
export function awarenessPercentFromAdstock(
  adstock: number,
  alphaAwareness: number,
): number {
  return alphaAwareness * adstock;
}

export function calculateAwareness(input: AwarenessInput): AwarenessResult {
  const weeklyGrp = buildWeeklyGrpSchedule(
    input.totalGrp,
    input.campaignWeeks,
    input.grpAllocation,
  );
  const adstockSeries = iterateWeeklyAdstock(
    weeklyGrp,
    input.lambdaWeekly,
    input.alphaConversion,
    input.patternCoefficient,
  );

  const awarenessCurve: AwarenessCurvePoint[] = adstockSeries.map(
    (adstock, index) => {
      const raw = awarenessPercentFromAdstock(adstock, input.alphaAwareness);
      return {
        week: index + 1,
        grp: weeklyGrp[index] ?? 0,
        adstock,
        awarenessRate: Math.min(100, raw),
      };
    },
  );

  const finalAdstock = adstockSeries[adstockSeries.length - 1] ?? 0;
  const rawAwareness = awarenessPercentFromAdstock(
    finalAdstock,
    input.alphaAwareness,
  );

  return {
    awarenessRate: Math.min(100, rawAwareness),
    finalAdstock,
    awarenessCurve,
    linearApproxWarning:
      input.totalGrp < LINEAR_GRP_MIN || input.totalGrp > LINEAR_GRP_MAX,
    saturated: rawAwareness > 100,
  };
}
