import { getPopulation } from "@/lib/masters/area-master";
import { getMasterData } from "@/lib/masters/load-json";
import {
  getStationPerCost,
  listStationsForArea,
} from "@/lib/masters/station-master";
import { calculateReach } from "./reach-engine";

export type StationReachRow = {
  station: string;
  population: number;
  grp: number;
  perCost: number;
  reachRate: number;
  reachCount: number;
  correlation: number;
};

export type StationReachInput = {
  area: string;
  target: string;
  selectedStations: string[];
  totalGrp: number;
  patternCostKey: string;
  effectiveFrequency: number;
  kEffective: number;
  correlationRho?: number;
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

export function calculateStationReach(
  input: StationReachInput,
): StationReachResult {
  const stations =
    input.selectedStations.length > 0
      ? input.selectedStations
      : listStationsForArea(input.area);

  if (stations.length === 0) {
    throw new Error(`放送局マスタが見つかりません: ${input.area}`);
  }

  const rho = input.correlationRho ?? getDefaultStationCorrelation();
  const grpPerStation = input.totalGrp / stations.length;

  const rows: StationReachRow[] = stations.map((station) => {
    const population = resolveStationPopulation(
      input.area,
      station,
      input.target,
      stations.length,
    );
    const perCost = getStationPerCost(
      input.area,
      station,
      input.patternCostKey,
      input.target,
    );
    const reach = calculateReach({
      population,
      grp: grpPerStation,
      effectiveFrequency: input.effectiveFrequency,
      cmCoefficient: input.kEffective,
    });

    return {
      station,
      population,
      grp: grpPerStation,
      perCost,
      reachRate: reach.reachRate,
      reachCount: reach.reachCount,
      correlation: rho,
    };
  });

  const combinedReachRate = combineStationReachRate(
    rows.map((row) => row.reachRate),
    rho,
  );
  const areaPopulation = getPopulation(input.area, input.target);
  const averageReachRate =
    rows.reduce((sum, row) => sum + row.reachRate, 0) / rows.length;

  return {
    rows,
    combinedReachRate,
    combinedReachCount: Math.round(areaPopulation * combinedReachRate),
    averageReachRate,
    usedStationCount: stations.length,
  };
}
