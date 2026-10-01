import { getPopulation } from "@/lib/masters/area-master";
import { getMasterData } from "@/lib/masters/load-json";
import {
  listStationsForArea,
  resolveStationPerCost,
} from "@/lib/masters/station-master";
import { calculateReach } from "./reach-engine";

/**
 * 局へのGRP按分方式
 * - equal: 選択局へ均等
 * - cost_weighted: 局パーコストの逆数に比例（単価の安い局ほど同じ金額でGRPが取れるため厚く配分）
 * - manual: ユーザー指定の配分比率
 */
export type StationGrpAllocation = "equal" | "cost_weighted" | "manual";

export const DEFAULT_STATION_GRP_ALLOCATION: StationGrpAllocation =
  "cost_weighted";

export function normalizeStationGrpAllocation(
  value: string | null | undefined,
): StationGrpAllocation {
  if (value === "equal" || value === "manual") return value;
  return DEFAULT_STATION_GRP_ALLOCATION;
}

export type StationReachRow = {
  station: string;
  population: number;
  /** 局へ按分したGRP（リーチ計算に渡した値。CM秒数の実効GRP換算後） */
  grp: number;
  /** 総GRPに占める配分比率（0–1） */
  grpShare: number;
  perCost: number;
  reachRate: number;
  reachCount: number;
  correlation: number;
};

export type StationReachModelInput = {
  area: string;
  target: string;
  selectedStations: string[];
  patternCostKey: string;
  effectiveFrequency: number;
  kEffective: number;
  correlationRho?: number;
  stationPerCosts?: Record<string, number>;
  allocation?: StationGrpAllocation;
  /** allocation=manual のとき局コード→配分重み（合計で正規化） */
  manualGrpShares?: Record<string, number>;
};

export type StationReachInput = StationReachModelInput & {
  totalGrp: number;
};

type StationModelEntry = {
  station: string;
  population: number;
  perCost: number;
  grpShare: number;
};

/** GRPに依存しない局別の前提（人口・単価・配分比率）を一度だけ解決したもの */
export type StationReachModel = {
  entries: StationModelEntry[];
  rho: number;
  areaPopulation: number;
  effectiveFrequency: number;
  kEffective: number;
  allocation: StationGrpAllocation;
  /** GRP配分で加重した平均パーコスト Σ(配分比率 × 局パーコスト)（円/GRP、CM秒数補正前） */
  weightedPerCost: number;
};

export type StationReachResult = {
  rows: StationReachRow[];
  combinedReachRate: number;
  combinedReachCount: number;
  averageReachRate: number;
  usedStationCount: number;
};

export function getDefaultStationCorrelation(): number {
  const bench = getMasterData().planning_benchmarks
    ?.station_inter_correlation_default;
  if (!bench) {
    throw new Error(
      "station_inter_correlation_default が master_data.json に見つかりません",
    );
  }
  return bench.value;
}

function resolveStationPopulation(
  area: string,
  station: string,
  target: string,
  stationCount: number,
): number {
  const rows = getMasterData().station_population_master ?? [];
  const row = rows.find((r) => r.area === area && r.station === station);
  if (row) {
    if (target.includes("世帯") && row.household_thousand != null) {
      return row.household_thousand * 1000;
    }
    if (row.person_total_thousand != null) {
      return row.person_total_thousand * 1000;
    }
  }

  return getPopulation(area, target) / Math.max(1, stationCount);
}

/**
 * 局別のGRP配分比率（合計1）。
 * cost_weighted はパーコストの逆数比例（安い局に厚く）。単価が全局0なら均等へフォールバック。
 * manual は manualWeights を正規化（不正時は均等）。
 */
export function stationGrpShares(
  perCosts: number[],
  allocation: StationGrpAllocation,
  manualWeights?: number[],
): number[] {
  const count = perCosts.length;
  if (count === 0) {
    return [];
  }
  const equal = perCosts.map(() => 1 / count);
  if (allocation === "equal") {
    return equal;
  }
  if (allocation === "manual") {
    const weights = (manualWeights ?? []).slice(0, count);
    while (weights.length < count) weights.push(0);
    const normalized = weights.map((w) =>
      Number.isFinite(w) && w > 0 ? w : 0,
    );
    const sum = normalized.reduce((a, b) => a + b, 0);
    if (sum <= 0) return equal;
    return normalized.map((w) => w / sum);
  }
  // cost_weighted: 安い局ほど GRP を厚く（1/perCost）
  const weights = perCosts.map((c) => (Number.isFinite(c) && c > 0 ? 1 / c : 0));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    return equal;
  }
  return weights.map((w) => w / sum);
}

/**
 * Sainsbury式局合成: Reach = 1 − ∏(1 − Reach_i × √(1−ρ))
 */
export function combineStationReachRate(
  stationReachRates: number[],
  rho: number,
): number {
  if (stationReachRates.length === 0) {
    return 0;
  }
  const adjustment = Math.sqrt(Math.max(0, 1 - rho));
  let product = 1;
  for (const reachRate of stationReachRates) {
    product *= 1 - reachRate * adjustment;
  }
  return 1 - product;
}

export function buildStationReachModel(
  input: StationReachModelInput,
): StationReachModel {
  const stations =
    input.selectedStations.length > 0
      ? input.selectedStations
      : listStationsForArea(input.area);

  if (stations.length === 0) {
    throw new Error(`放送局マスタが見つかりません: ${input.area}`);
  }

  const allocation = input.allocation ?? DEFAULT_STATION_GRP_ALLOCATION;
  const perCosts = stations.map((station) =>
    resolveStationPerCost(
      input.area,
      station,
      input.patternCostKey,
      input.target,
      input.stationPerCosts,
    ),
  );
  const manualWeights = stations.map(
    (station) => input.manualGrpShares?.[station] ?? 0,
  );
  const shares = stationGrpShares(perCosts, allocation, manualWeights);

  const entries: StationModelEntry[] = stations.map((station, index) => ({
    station,
    population: resolveStationPopulation(
      input.area,
      station,
      input.target,
      stations.length,
    ),
    perCost: perCosts[index],
    grpShare: shares[index],
  }));

  return {
    entries,
    rho: input.correlationRho ?? getDefaultStationCorrelation(),
    areaPopulation: getPopulation(input.area, input.target),
    effectiveFrequency: input.effectiveFrequency,
    kEffective: input.kEffective,
    allocation,
    weightedPerCost: entries.reduce(
      (sum, entry) => sum + entry.grpShare * entry.perCost,
      0,
    ),
  };
}

function stationReachAt(
  model: StationReachModel,
  entry: StationModelEntry,
  totalGrp: number,
) {
  return calculateReach({
    population: entry.population,
    grp: totalGrp * entry.grpShare,
    effectiveFrequency: model.effectiveFrequency,
    cmCoefficient: model.kEffective,
  });
}

/** 局合成リーチ率のみを返す軽量版（最適GRP探索など多数回評価する用途） */
export function combinedReachRateAt(
  model: StationReachModel,
  totalGrp: number,
): number {
  return combineStationReachRate(
    model.entries.map((entry) => stationReachAt(model, entry, totalGrp).reachRate),
    model.rho,
  );
}

export function evaluateStationReach(
  model: StationReachModel,
  totalGrp: number,
): StationReachResult {
  const rows: StationReachRow[] = model.entries.map((entry) => {
    const reach = stationReachAt(model, entry, totalGrp);
    return {
      station: entry.station,
      population: entry.population,
      grp: totalGrp * entry.grpShare,
      grpShare: entry.grpShare,
      perCost: entry.perCost,
      reachRate: reach.reachRate,
      reachCount: reach.reachCount,
      correlation: model.rho,
    };
  });

  const combinedReachRate = combineStationReachRate(
    rows.map((row) => row.reachRate),
    model.rho,
  );

  return {
    rows,
    combinedReachRate,
    combinedReachCount: Math.round(model.areaPopulation * combinedReachRate),
    averageReachRate:
      rows.reduce((sum, row) => sum + row.reachRate, 0) / rows.length,
    usedStationCount: rows.length,
  };
}

export function calculateStationReach(
  input: StationReachInput,
): StationReachResult {
  return evaluateStationReach(buildStationReachModel(input), input.totalGrp);
}
