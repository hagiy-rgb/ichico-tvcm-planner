import {
  grpForReachAndAwareness,
  perCostForCmLength,
} from "@/lib/engines/cm-length";
import { resolvePatternCoefficient, resolveCostPatternKey } from "@/lib/engines/creative-pattern-engine";
import {
  buildStationReachModel,
  evaluateStationReach,
  type StationGrpAllocation,
  type StationReachModel,
} from "@/lib/engines/station-engine";
import type { SimulationInput } from "@/types/simulation";

/** 理論最大＝制約なし貪欲 / 実務寄り＝最低・最大シェア制約付き */
export type ReachMaxMode = "theoretical" | "practical";

export type ReachMaxAllocationResult = {
  /** 局コード → GRP配分比率（合計1） */
  shares: Record<string, number>;
  /** 局コード → 出稿金額（円） */
  budgets: Record<string, number>;
  /** 最適化後の合計GRP（入力GRP単位） */
  totalGrp: number;
  /** 最適化後のリーチ人数 */
  reachCount: number;
  /** 使用した総予算（円） */
  totalBudget: number;
  /** 適用したモード */
  mode: ReachMaxMode;
  /** 実務寄りで使った最低金額シェア（0–1） */
  minBudgetShare: number;
  /** 実務寄りで使った最大金額シェア（0–1） */
  maxBudgetShare: number;
};

export type ReachMaxOptions = {
  chunks?: number;
  mode?: ReachMaxMode;
  /** 各局の最低金額シェア（0–1）。未指定時は均等の半分 */
  minBudgetShare?: number;
  /** 各局の最大金額シェア（0–1）。未指定時は 0.40（実行可能性で引き上げ） */
  maxBudgetShare?: number;
};

/** 実務寄りの既定: 最低＝均等の半分、最大＝40%（実行可能になるよう補正） */
export function resolvePracticalShareBounds(
  stationCount: number,
  options?: { minBudgetShare?: number; maxBudgetShare?: number },
): { minBudgetShare: number; maxBudgetShare: number } {
  const n = Math.max(1, stationCount);
  const equal = 1 / n;
  let minShare =
    options?.minBudgetShare != null && Number.isFinite(options.minBudgetShare)
      ? Math.max(0, Math.min(equal, options.minBudgetShare))
      : equal * 0.5;
  let maxShare =
    options?.maxBudgetShare != null && Number.isFinite(options.maxBudgetShare)
      ? Math.max(0, Math.min(1, options.maxBudgetShare))
      : 0.4;

  minShare = Math.min(minShare, equal);
  maxShare = Math.max(maxShare, minShare, 1 - (n - 1) * minShare);
  if (maxShare * n < 1 - 1e-12) {
    maxShare = equal;
  }
  return { minBudgetShare: minShare, maxBudgetShare: maxShare };
}

function modelWithShares(
  base: StationReachModel,
  shares: number[],
): StationReachModel {
  return {
    ...base,
    entries: base.entries.map((entry, i) => ({
      ...entry,
      grpShare: shares[i],
    })),
    weightedPerCost: base.entries.reduce(
      (sum, entry, i) => sum + shares[i] * entry.perCost,
      0,
    ),
    allocation: "manual" as StationGrpAllocation,
  };
}

/**
 * 固定予算の下で、選択局への金額配分を貪欲に振り、合成リーチを最大化する。
 * theoretical: 制約なし（少数局に寄りやすい）
 * practical: 全局に最低シェアを保証し、1局あたり上限で寡占を抑制
 */
export function optimizeStationBudgetForMaxReach(
  input: SimulationInput,
  totalBudgetYen: number,
  options?: ReachMaxOptions,
): ReachMaxAllocationResult | null {
  const stations = input.selectedStations;
  if (stations.length === 0 || !(totalBudgetYen > 0)) {
    return null;
  }

  const mode: ReachMaxMode = options?.mode ?? "practical";
  const bounds =
    mode === "practical"
      ? resolvePracticalShareBounds(stations.length, options)
      : { minBudgetShare: 0, maxBudgetShare: 1 };

  const kEffective =
    input.coefficients.kPoisson *
    resolvePatternCoefficient(
      input.creativePattern.presetName,
      input.creativePattern.blocks,
    );

  const reachModel = buildStationReachModel({
    area: input.area,
    target: input.target,
    selectedStations: stations,
    patternCostKey: resolveCostPatternKey(
      input.creativePattern.presetName,
      input.creativePattern.blocks,
    ),
    effectiveFrequency: input.coefficients.effectiveFrequency,
    kEffective,
    stationPerCosts: input.stationPerCosts,
    allocation: "equal",
  });

  const costs = reachModel.entries.map((e) =>
    perCostForCmLength(e.perCost, input.cmLength),
  );
  if (costs.some((c) => !(c > 0))) {
    return null;
  }

  const chunks = Math.max(40, Math.min(options?.chunks ?? 100, 200));
  const chunkYen = totalBudgetYen / chunks;
  const minChunks =
    mode === "practical"
      ? Math.floor(bounds.minBudgetShare * chunks + 1e-9)
      : 0;
  const maxChunks =
    mode === "practical"
      ? Math.max(minChunks, Math.floor(bounds.maxBudgetShare * chunks + 1e-9))
      : chunks;

  const chunkCounts = stations.map(() => minChunks);
  let remaining = chunks - minChunks * stations.length;
  if (remaining < 0) {
    // 端数で超過した場合は均等に丸め直す
    const base = Math.floor(chunks / stations.length);
    chunkCounts.fill(base);
    remaining = chunks - base * stations.length;
  }

  const spendFromCounts = (counts: number[]): number[] =>
    counts.map((c) => c * chunkYen);

  const reachAtSpends = (values: number[]): number => {
    const grps = values.map((spend, i) => spend / costs[i]);
    const totalGrp = grps.reduce((a, b) => a + b, 0);
    if (totalGrp <= 0) return 0;
    const shares = grps.map((g) => g / totalGrp);
    const customModel = modelWithShares(reachModel, shares);
    const effectiveTotal = grpForReachAndAwareness(totalGrp, input.cmLength);
    return evaluateStationReach(customModel, effectiveTotal).combinedReachCount;
  };

  for (let step = 0; step < remaining; step++) {
    let bestIndex = -1;
    let bestReach = -1;
    for (let i = 0; i < stations.length; i++) {
      if (chunkCounts[i] + 1 > maxChunks) continue;
      const trial = [...chunkCounts];
      trial[i] += 1;
      const reach = reachAtSpends(spendFromCounts(trial));
      if (reach > bestReach) {
        bestReach = reach;
        bestIndex = i;
      }
    }
    if (bestIndex < 0) {
      // 上限で止まる場合は最も少ない局へ（実行保証）
      let fallback = 0;
      for (let i = 1; i < stations.length; i++) {
        if (chunkCounts[i] < chunkCounts[fallback]) fallback = i;
      }
      chunkCounts[fallback] += 1;
    } else {
      chunkCounts[bestIndex] += 1;
    }
  }

  const spends = spendFromCounts(chunkCounts);
  const grps = spends.map((spend, i) => spend / costs[i]);
  const totalGrp = grps.reduce((a, b) => a + b, 0);
  const sharesArr =
    totalGrp > 0
      ? grps.map((g) => g / totalGrp)
      : stations.map(() => 1 / stations.length);

  const shares: Record<string, number> = {};
  const budgets: Record<string, number> = {};
  stations.forEach((station, i) => {
    shares[station] = sharesArr[i];
    budgets[station] = Math.round(spends[i]);
  });

  return {
    shares,
    budgets,
    totalGrp,
    reachCount: reachAtSpends(spends),
    totalBudget: Math.round(totalBudgetYen),
    mode,
    minBudgetShare: bounds.minBudgetShare,
    maxBudgetShare: bounds.maxBudgetShare,
  };
}
