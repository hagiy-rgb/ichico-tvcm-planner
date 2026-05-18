import { getPopulation } from "@/lib/masters/area-master";
import { getPatternPreset } from "@/lib/masters/pattern-master";
import { getAveragePerCost } from "@/lib/masters/station-master";
import type { DaypartsData } from "@/types/dayparts";
import type { SimulationInput, SimulationResults } from "@/types/simulation";
import { computePatternCoefficientFromDayparts } from "./dayparts-engine";
import {
  resolveCostPatternKey,
  resolvePatternCoefficient,
} from "./creative-pattern-engine";
import { calculateAwareness } from "./awareness-engine";
import { calculateCost } from "./cost-engine";
import { calculateOptimalGrp } from "./optimizer";
import { calculateReach } from "./reach-engine";
import { calculateStationReach } from "./station-engine";

const CURVE_GRP_STEPS = [0, 25, 50, 75, 100, 125, 150, 175, 200, 250, 300];

function buildCurveGrps(targetGrp: number): number[] {
  const extended = [...CURVE_GRP_STEPS];
  if (targetGrp > 300) {
    for (let g = 350; g <= targetGrp; g += 50) {
      extended.push(g);
    }
  } else if (!extended.includes(targetGrp) && targetGrp > 0) {
    extended.push(targetGrp);
  }
  return Array.from(new Set(extended)).sort((a, b) => a - b);
}

export type RunSimulationOptions = {
  dayparts?: DaypartsData | null;
};

export function runSimulation(
  input: SimulationInput,
  options: RunSimulationOptions = {},
): SimulationResults {
  const population = getPopulation(input.area, input.target);
  const kIndustry = input.coefficients.kPoisson;

  let kPatternCoefficient = resolvePatternCoefficient(
    input.creativePattern.presetName,
    input.creativePattern.blocks,
  );
  let kPatternSource: SimulationResults["kPatternSource"] = "preset";
  let precision: SimulationResults["precision"] = "standard";
  let daypartsLabel: string | undefined;

  const dayparts = options.dayparts ?? null;
  if (dayparts) {
    const fromDayparts = computePatternCoefficientFromDayparts(
      dayparts,
      input.target,
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
  const costPatternKey = resolveCostPatternKey(
    input.creativePattern.presetName,
    input.creativePattern.blocks,
  );
  const perCost = getAveragePerCost(
    input.area,
    costPatternKey,
    input.target,
  );

  const stationReach = calculateStationReach({
    area: input.area,
    target: input.target,
    selectedStations: input.selectedStations,
    totalGrp: input.grp,
    patternCostKey: costPatternKey,
    effectiveFrequency: input.coefficients.effectiveFrequency,
    kEffective,
  });

  const reachRate = stationReach.combinedReachRate;
  const reachCount = stationReach.combinedReachCount;

  const cost = calculateCost({
    grp: input.grp,
    perCost,
    population,
    reachRate,
  });

  const curveGrps = buildCurveGrps(input.grp);
  const reachCurve = curveGrps.map((grp) => {
    const point = calculateReach({
      population,
      grp,
      effectiveFrequency: input.coefficients.effectiveFrequency,
      cmCoefficient: kIndustry,
      effectiveCoefficient: kEffective,
    });
    return {
      grp,
      reachRate: point.reachRate * 100,
      reachCount: point.reachCount,
    };
  });

  const preset = getPatternPreset(input.creativePattern.presetName);
  const patternLabel =
    input.creativePattern.presetName === "カスタム"
      ? "カスタム"
      : (preset?.label ?? input.creativePattern.presetName);

  const awareness = calculateAwareness({
    totalGrp: input.grp,
    campaignWeeks: input.campaignWeeks,
    grpAllocation: input.grpAllocation,
    lambdaWeekly: input.coefficients.lambdaWeekly,
    alphaConversion: input.coefficients.alphaConversion,
    alphaAwareness: input.coefficients.alphaAwareness,
    patternCoefficient: kPatternCoefficient,
  });

  const optimalGrp = calculateOptimalGrp({
    population,
    perCost,
    effectiveFrequency: input.coefficients.effectiveFrequency,
    kEffective,
    maxGrp: Math.max(500, input.grp * 3),
  });

  return {
    population,
    kIndustry,
    kPatternCoefficient,
    kEffective,
    lambda: kEffective * input.grp,
    lambdaWeekly: input.coefficients.lambdaWeekly,
    alphaAwareness: input.coefficients.alphaAwareness,
    funnelStage: input.funnelStage,
    patternLabel,
    reachRate,
    reachCount,
    averageStationReachRate: stationReach.averageReachRate,
    stationReachRows: stationReach.rows,
    perCost,
    totalBudget: cost.totalBudget,
    cpm: cost.cpm,
    reachUnitPrice: cost.reachUnitPrice,
    awarenessRate: awareness.awarenessRate,
    finalAdstock: awareness.finalAdstock,
    awarenessLinearWarning: awareness.linearApproxWarning,
    awarenessSaturated: awareness.saturated,
    optimalGrp,
    precision,
    kPatternSource,
    daypartsLabel,
    reachCurve,
    awarenessCurve: awareness.awarenessCurve,
  };
}
