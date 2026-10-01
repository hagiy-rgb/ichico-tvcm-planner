import { OPTIMIZER_DEFAULT_MAX_GRP } from "@/lib/constants/model-constants";
import { grpForReachAndAwareness, perCostForCmLength } from "@/lib/engines/cm-length";
import { getPatternPreset } from "@/lib/masters/pattern-master";
import { getDefaultDisplayName } from "@/lib/masters/station-network";
import type {
  SimulationInput,
  SimulationResults,
  StationBudgetBreakdown,
} from "@/types/simulation";
import { calculateAwareness } from "./awareness-engine";
import { calculateCost } from "./cost-engine";
import {
  clampCampaignPeriods,
  convertPeriodCount,
  normalizeGrpDistribution,
  normalizePlanningGranularity,
  resolvePeriodGrpSchedule,
} from "./grp-schedule";
import { calculateOptimalGrp, costPerThousandReachedAtGrp } from "./optimizer";
import {
  reachAtInputGrp,
  reachRateAtInputGrp,
  resolveReachContext,
  type RunSimulationOptions,
} from "./reach-context";
import { buildReachCurveFromContext } from "./reach-curve-builder";
import { buildWebReplaceSuggestion } from "./web-replace-engine";

export type { RunSimulationOptions } from "./reach-context";

function buildStationBudgetBreakdown(
  input: SimulationInput,
  rows: SimulationResults["stationReachRows"],
  totalBudget: number,
): StationBudgetBreakdown[] {
  return rows.map((row) => {
    const inputGrp = input.grp * row.grpShare;
    const adjustedPerCost = perCostForCmLength(row.perCost, input.cmLength);
    const budget = inputGrp * adjustedPerCost;
    const spotRaw = input.stationSpotUnitPrices?.[row.station];
    const spotUnitPrice =
      spotRaw != null && Number.isFinite(spotRaw) && spotRaw > 0
        ? Math.round(spotRaw)
        : null;
    return {
      station: row.station,
      displayName:
        input.stationDisplayNames?.[row.station] ??
        getDefaultDisplayName(row.station),
      grp: inputGrp,
      grpShare: row.grpShare,
      perCost: adjustedPerCost,
      budget,
      budgetSharePercent: totalBudget > 0 ? (budget / totalBudget) * 100 : 0,
      spotUnitPrice,
      estimatedSpots:
        spotUnitPrice != null && spotUnitPrice > 0
          ? Math.floor(budget / spotUnitPrice)
          : null,
    };
  });
}

export function runSimulation(
  input: SimulationInput,
  options: RunSimulationOptions = {},
): SimulationResults {
  const ctx = resolveReachContext(input, options);
  const effectiveGrp = grpForReachAndAwareness(input.grp, input.cmLength);

  const stationReach = reachAtInputGrp(ctx, input.grp);
  const reachRate = stationReach.combinedReachRate;
  const reachCount = stationReach.combinedReachCount;

  const cost = calculateCost({
    grp: input.grp,
    perCost: ctx.perCost,
    population: ctx.population,
    reachRate,
  });

  const reachCurve = buildReachCurveFromContext(ctx, input.grp);

  const preset = getPatternPreset(input.creativePattern.presetName);
  const patternLabel =
    input.creativePattern.presetName === "カスタム"
      ? "カスタム"
      : (preset?.label ?? input.creativePattern.presetName);

  const grpDistribution = normalizeGrpDistribution(
    input.grpDistribution ?? input.grpAllocation,
  );
  const planningGranularity = normalizePlanningGranularity(
    input.planningGranularity,
  );
  const campaignPeriods = clampCampaignPeriods(
    input.campaignPeriods ??
      convertPeriodCount(input.campaignWeeks ?? 4, "week", planningGranularity),
    planningGranularity,
  );
  const periodGrpSchedule = resolvePeriodGrpSchedule({
    totalGrp: input.grp,
    periods: campaignPeriods,
    distribution: grpDistribution,
    customPeriodGrp:
      input.customPeriodGrp ??
      (planningGranularity === "week" ? input.customWeeklyGrp : null),
    manualEnabled: input.manualGrpEnabled,
  });

  const awareness = calculateAwareness({
    periodGrp: periodGrpSchedule,
    granularity: planningGranularity,
    effectiveGrpMultiplier: grpForReachAndAwareness(1, input.cmLength),
    lambdaWeekly: input.coefficients.lambdaWeekly,
    alphaConversion: input.coefficients.alphaConversion,
    maxAwareness: input.coefficients.maxAwareness,
    halfSaturationAdstock: input.coefficients.halfSaturationAdstock,
    patternCoefficient: ctx.kPatternCoefficient,
  });

  const optimizerCtx = {
    reachRateAtGrp: (grp: number) => reachRateAtInputGrp(ctx, grp),
    population: ctx.population,
    perCost: ctx.perCost,
    maxGrp: Math.max(OPTIMIZER_DEFAULT_MAX_GRP, Math.ceil(input.grp * 3)),
  };
  const optimalGrp = calculateOptimalGrp(optimizerCtx, reachCurve);

  const reachPersonUnitPrice =
    reachCount > 0 ? cost.totalBudget / reachCount : Number.POSITIVE_INFINITY;

  const stationBudgetBreakdown = buildStationBudgetBreakdown(
    input,
    stationReach.rows,
    cost.totalBudget,
  );

  const webReplace = buildWebReplaceSuggestion({
    planGrp: input.grp,
    perCost: ctx.perCost,
    webUnitPriceYen: input.webVideoReachUnitPriceYen,
    reachCurve,
    tvPersonUnitPriceAtPlan: Number.isFinite(reachPersonUnitPrice)
      ? reachPersonUnitPrice
      : null,
  });

  return {
    population: ctx.population,
    kIndustry: ctx.kIndustry,
    kPatternCoefficient: ctx.kPatternCoefficient,
    kEffective: ctx.kEffective,
    lambda: ctx.kEffective * effectiveGrp,
    lambdaWeekly: input.coefficients.lambdaWeekly,
    planningGranularity,
    campaignPeriods,
    lambdaPeriod: awareness.lambdaPeriod,
    periodImpactFactor: awareness.periodImpactFactor,
    periodGrpSchedule,
    maxAwareness: input.coefficients.maxAwareness,
    halfSaturationAdstock: input.coefficients.halfSaturationAdstock,
    funnelStage: input.funnelStage,
    patternLabel,
    reachRate,
    reachCount,
    averageStationReachRate: stationReach.averageReachRate,
    stationReachRows: stationReach.rows,
    stationGrpAllocation: ctx.stationModel.allocation,
    stationBudgetBreakdown,
    perCost: ctx.perCost,
    totalBudget: cost.totalBudget,
    cpm: cost.cpm,
    reachUnitPrice: cost.reachUnitPrice,
    reachPersonUnitPrice,
    displayUnitPrice: cost.displayUnitPrice,
    costPerThousandReached: costPerThousandReachedAtGrp(
      optimizerCtx,
      input.grp,
    ),
    awarenessRate: awareness.awarenessRate,
    finalAdstock: awareness.finalAdstock,
    awarenessSaturationRatio: awareness.saturationRatio,
    awarenessZone: awareness.zone,
    optimalGrp,
    precision: ctx.precision,
    kPatternSource: ctx.kPatternSource,
    daypartsLabel: ctx.daypartsLabel,
    reachCurve,
    awarenessCurve: awareness.awarenessCurve,
    webReplace,
  };
}
