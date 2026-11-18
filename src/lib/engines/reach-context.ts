import {
  grpForReachAndAwareness,
  perCostForCmLength,
} from "@/lib/engines/cm-length";
import { getPopulation } from "@/lib/masters/area-master";
import type { DaypartsData } from "@/types/dayparts";
import type { PrecisionLevel, SimulationInput } from "@/types/simulation";
import { calculateReach, type ReachResult } from "./reach-engine";
import {
  resolveCostPatternKey,
  resolvePatternCoefficient,
} from "./creative-pattern-engine";
import { computePatternCoefficientFromDayparts } from "./dayparts-engine";
import {
  buildStationReachModel,
  evaluateStationReach,
  type StationReachModel,
  type StationReachResult,
} from "./station-engine";

export type RunSimulationOptions = {
  dayparts?: DaypartsData | null;
};

/**
 * リーチ計算の前提（ターゲット単位）。
 * 主リーチは「エリア合計GRP × 単一母集団ポアソン」。
 * 局モデルは費用按分と局別リーチ参考値用。
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
  effectiveFrequency: number;
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
    effectiveFrequency: input.coefficients.effectiveFrequency,
    cmLength: input.cmLength,
    stationModel,
    perCost: perCostForCmLength(stationModel.weightedPerCost, input.cmLength),
  };
}

/** 主リーチ: 合計GRPを単一母集団に投下したポアソン到達 */
export function campaignReachAtGrp(
  ctx: ReachContext,
  grp: number,
): ReachResult {
  return calculateReach({
    population: ctx.population,
    grp: Math.max(0, grpForReachAndAwareness(grp, ctx.cmLength)),
    effectiveFrequency: ctx.effectiveFrequency,
    cmCoefficient: ctx.kEffective,
  });
}

/** 局別リーチ（参考・費用按分後） */
export function stationReachAtInputGrp(
  ctx: ReachContext,
  grp: number,
): StationReachResult {
  return evaluateStationReach(
    ctx.stationModel,
    grpForReachAndAwareness(grp, ctx.cmLength),
  );
}

/** 入力条件での主リーチのみ（感度分析用） */
export function simulateReach(
  input: SimulationInput,
  options: RunSimulationOptions = {},
): { reachRate: number; reachCount: number } {
  const result = campaignReachAtGrp(
    resolveReachContext(input, options),
    input.grp,
  );
  return {
    reachRate: result.reachRate,
    reachCount: result.reachCount,
  };
}

/** 主リーチ率（カーブ・最適GRP・逆算の共通評価） */
export function reachRateAtInputGrp(ctx: ReachContext, grp: number): number {
  return campaignReachAtGrp(ctx, grp).reachRate;
}
