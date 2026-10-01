import type { SimulationInput, SimulationResults } from "@/types/simulation";

export type DecisionSummary = {
  currentGrp: number;
  recommendedGrp: number | null;
  deltaGrp: number | null;
  deltaBudget: number | null;
  currentUnitPrice: number | null;
  recommendedUnitPrice: number | null;
  action: string;
};

function finiteOrNull(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) ? value : null;
}

/**
 * 現状GRPと方式C（最安リーチ単価）の差分から、先頭に出す判定を作る。
 */
export function buildDecisionSummary(
  input: SimulationInput,
  results: SimulationResults,
): DecisionSummary {
  const currentGrp = input.grp;
  const recommendedGrp = results.optimalGrp.minReachUnitPriceGrp;
  const currentUnitPrice = finiteOrNull(results.reachUnitPrice);
  const recommendedUnitPrice = finiteOrNull(
    results.optimalGrp.minReachUnitPrice,
  );

  if (recommendedGrp == null) {
    return {
      currentGrp,
      recommendedGrp: null,
      deltaGrp: null,
      deltaBudget: null,
      currentUnitPrice,
      recommendedUnitPrice,
      action: "リーチカーブ上の最安単価を特定できません。エリア・局・GRPを確認してください。",
    };
  }

  const deltaGrp = recommendedGrp - currentGrp;
  const deltaBudget = deltaGrp * results.perCost;
  const absGrp = Math.abs(deltaGrp);
  const near = absGrp < 1;

  let action: string;
  if (near) {
    action = `現状GRP ${Math.round(currentGrp * 10) / 10} は最安リーチ単価付近です。`;
  } else if (deltaGrp > 0) {
    action = `GRPを ${Math.round(deltaGrp * 10) / 10} 増やして ${Math.round(recommendedGrp * 10) / 10} にすると、リーチ単価が最小になります。`;
  } else {
    action = `GRPを ${Math.round(absGrp * 10) / 10} 減らして ${Math.round(recommendedGrp * 10) / 10} にすると、リーチ単価が最小になります。`;
  }

  return {
    currentGrp,
    recommendedGrp,
    deltaGrp,
    deltaBudget,
    currentUnitPrice,
    recommendedUnitPrice,
    action,
  };
}
