import {
  grpForReachAndAwareness,
  perCostForCmLength,
} from "@/lib/engines/cm-length";
import { getPopulation } from "@/lib/masters/area-master";
import type { DaypartsData } from "@/types/dayparts";
import type { PrecisionLevel, SimulationInput } from "@/types/simulation";
import {
  resolveCostPatternKey,
  resolvePatternCoefficient,
} from "./creative-pattern-engine";
import { computePatternCoefficientFromDayparts } from "./dayparts-engine";
import {
  buildStationReachModel,
  combinedReachRateAt,
  evaluateStationReach,
  type StationReachModel,
  type StationReachResult,
} from "./station-engine";

export type RunSimulationOptions = {
  dayparts?: DaypartsData | null;
};

/**
 * リーチ計算の前提（ターゲット単位）。本計算・リーチカーブ・最適GRP探索・感度分析が
 * すべてこのコンテキスト経由で同じプリミティブ（局合成＋CM秒数の実効GRP）を使う。
 */
export type ReachContext = {
  target: string;
  population: number;
  kIndustry: number;
  kPatternCoefficient: number;
  kPatternSource: "preset" | "dayparts";
  precision: PrecisionLevel;
  daypartsLabel?: string;
  kEffective: number;
  cmLength: SimulationInput["cmLength"];
  stationModel: StationReachModel;
  /** 入力GRPあたり出稿単価（円/GRP）。局GRP配分で加重し、CM秒数補正済み */
  perCost: number;
};

export function resolveReachContext(
  input: SimulationInput,
  options: RunSimulationOptions = {},
  target: string = input.target,
): ReachContext {
  const population = getPopulation(input.area, target);
  const kIndustry = input.coefficients.kPoisson;

  let kPatternCoefficient = resolvePatternCoefficient(
    input.creativePattern.presetName,
    input.creativePattern.blocks,
  );
  let kPatternSource: ReachContext["kPatternSource"] = "preset";
  let precision: PrecisionLevel = "standard";
  let daypartsLabel: string | undefined;

  const dayparts = options.dayparts ?? null;
  if (dayparts) {
    const fromDayparts = computePatternCoefficientFromDayparts(
      dayparts,
      target,
      input.selectedStations,
      input.creativePattern.blocks,
    );
    if (fromDayparts) {
      kPatternCoefficient = fromDayparts.coefficient;
      kPatternSource = "dayparts";
      precision = "high";
      daypartsLabel = dayparts.fileName;
    }
  }

  const kEffective = kIndustry * kPatternCoefficient;
  const stationModel = buildStationReachModel({
    area: input.area,
    target,
    selectedStations: input.selectedStations,
    patternCostKey: resolveCostPatternKey(
      input.creativePattern.presetName,
      input.creativePattern.blocks,
    ),
    effectiveFrequency: input.coefficients.effectiveFrequency,
    kEffective,
    stationPerCosts: input.stationPerCosts,
    allocation: input.stationGrpAllocation,
    manualGrpShares: input.stationManualGrpShares,
  });

  return {
    target,
    population,
    kIndustry,
    kPatternCoefficient,
    kPatternSource,
    precision,
    daypartsLabel,
    kEffective,
    cmLength: input.cmLength,
    stationModel,
    perCost: perCostForCmLength(stationModel.weightedPerCost, input.cmLength),
  };
}

/** 入力GRPでの局合成リーチ（CM秒数の実効GRP換算込み） */
export function reachAtInputGrp(
  ctx: ReachContext,
  grp: number,
): StationReachResult {
  return evaluateStationReach(
    ctx.stationModel,
    grpForReachAndAwareness(grp, ctx.cmLength),
  );
}

/** 入力条件でのリーチのみを求める（感度分析のように条件を振って多数回評価する用途） */
export function simulateReach(
  input: SimulationInput,
  options: RunSimulationOptions = {},
): { reachRate: number; reachCount: number } {
  const result = reachAtInputGrp(resolveReachContext(input, options), input.grp);
  return {
    reachRate: result.combinedReachRate,
    reachCount: result.combinedReachCount,
  };
}

/** reachAtInputGrp のリーチ率のみ（多数回評価用の軽量版） */
export function reachRateAtInputGrp(ctx: ReachContext, grp: number): number {
  return combinedReachRateAt(
    ctx.stationModel,
    grpForReachAndAwareness(grp, ctx.cmLength),
  );
}
