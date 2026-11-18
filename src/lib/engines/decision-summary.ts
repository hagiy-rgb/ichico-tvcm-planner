import type { SimulationInput, SimulationResults } from "@/types/simulation";
import { formatYen } from "@/lib/utils/number-format";

export type DecisionSummary = {
  currentGrp: number;
  currentReachRate: number;
  targetReachRate: number;
  requiredGrp: number | null;
  requiredBudget: number | null;
  gapGrp: number | null;
  gapBudget: number | null;
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

function formatPct(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

/**
 * 目標リーチ達成に必要なGRPを主判定にし、最安単価GRPは副次的に添える。
 */
export function buildDecisionSummary(
  input: SimulationInput,
  results: SimulationResults,
): DecisionSummary {
  const plan = results.reachPlan;
  const currentGrp = input.grp;
  const currentReachRate = results.reachRate;
  const targetReachRate = plan.targetReachRate;
  const requiredGrp = plan.requiredGrp;
  const requiredBudget = plan.requiredBudget;
  const gapGrp = plan.gapGrp;
  const gapBudget = plan.gapBudget;

  const recommendedGrp = results.optimalGrp.minReachUnitPriceGrp;
  const currentUnitPrice = finiteOrNull(results.reachUnitPrice);
  const recommendedUnitPrice = finiteOrNull(
    results.optimalGrp.minReachUnitPrice,
  );

  const efficiencyDeltaGrp =
    recommendedGrp != null ? recommendedGrp - currentGrp : null;
  const efficiencyDeltaBudget =
    efficiencyDeltaGrp != null ? efficiencyDeltaGrp * results.perCost : null;

  let action: string;
  if (requiredGrp == null) {
    action = `目標リーチ ${formatPct(targetReachRate)} は探索上限内で到達できません。F・k・エリア条件を見直してください。`;
  } else if (gapGrp != null && Math.abs(gapGrp) < 1) {
    action = `現状GRP ${Math.round(currentGrp * 10) / 10} で目標リーチ ${formatPct(targetReachRate)} にほぼ到達しています（実績 ${formatPct(currentReachRate)}）。`;
  } else if (gapGrp != null && gapGrp > 0) {
    action = `目標リーチ ${formatPct(targetReachRate)} には GRP ${requiredGrp}（約 ${requiredBudget != null ? formatYen(requiredBudget) : "—"}）が必要です。現状から ${Math.round(gapGrp)} GRP 不足です。`;
  } else if (gapGrp != null && gapGrp < 0) {
    action = `現状は目標リーチ ${formatPct(targetReachRate)} を上回っています（実績 ${formatPct(currentReachRate)}）。必要GRPは ${requiredGrp} です。`;
  } else {
    action = "目標リーチからの必要GRPを算出できません。";
  }

  if (recommendedGrp != null && Math.abs(efficiencyDeltaGrp ?? 0) >= 1) {
    action += ` 参考: 最安リーチ単価は GRP ${Math.round(recommendedGrp * 10) / 10} 付近です。`;
  }

  return {
    currentGrp,
    currentReachRate,
    targetReachRate,
    requiredGrp,
    requiredBudget,
    gapGrp,
    gapBudget,
    recommendedGrp,
    deltaGrp: efficiencyDeltaGrp,
    deltaBudget: efficiencyDeltaBudget,
    currentUnitPrice,
    recommendedUnitPrice,
    action,
  };
}
