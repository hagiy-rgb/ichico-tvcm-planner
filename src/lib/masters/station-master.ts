import type { PatternCostMap, StationCostRecord } from "@/types/master";
import { getMasterData } from "./load-json";

/** エリア名とコストマスタ上のエリア名の対応 */
const COST_AREA_ALIAS: Record<string, string> = {
  宮城: "仙台",
};

type PatternCostKey = keyof PatternCostMap;

function resolveCostArea(area: string): string {
  return COST_AREA_ALIAS[area] ?? area;
}

export function listStationsForArea(area: string): string[] {
  const costArea = resolveCostArea(area);
  const stations = new Set<string>();
  for (const row of getMasterData().station_cost_master) {
    if (row.area === costArea) {
      stations.add(row.station);
    }
  }
  return Array.from(stations).sort((a, b) => a.localeCompare(b, "ja"));
}

function resolvePatternCostKey(
  patternKey: string,
  costs: PatternCostMap,
): PatternCostKey {
  if (patternKey in costs) {
    return patternKey as PatternCostKey;
  }
  return "全日";
}

/**
 * エリア内の局コストを平均したパーコスト（円/GRP）
 * 個人ターゲットは person_cost、世帯は household_cost を使用
 */
export function getAveragePerCost(
  area: string,
  patternKey: string,
  target: string,
): number {
  const costArea = resolveCostArea(area);
  const usePersonCost = !target.includes("世帯");
  const rows = getMasterData().station_cost_master.filter(
    (r) => r.area === costArea,
  );

  if (rows.length === 0) {
    throw new Error(`コストマスタが見つかりません: ${area}`);
  }

  let sum = 0;
  for (const row of rows) {
    const map = usePersonCost ? row.person_cost : row.household_cost;
    const key = resolvePatternCostKey(patternKey, map);
    sum += map[key];
  }

  return sum / rows.length;
}

export function getStationPerCost(
  area: string,
  station: string,
  patternKey: string,
  target: string,
): number {
  const costArea = resolveCostArea(area);
  const usePersonCost = !target.includes("世帯");
  const row = getMasterData().station_cost_master.find(
    (r) => r.area === costArea && r.station === station,
  );
  if (!row) {
    throw new Error(`局コストが見つかりません: ${area} / ${station}`);
  }
  const map = usePersonCost ? row.person_cost : row.household_cost;
  const key = resolvePatternCostKey(patternKey, map);
  return map[key];
}

export function listStationCostRows(area: string): StationCostRecord[] {
  const costArea = resolveCostArea(area);
  return getMasterData().station_cost_master.filter((r) => r.area === costArea);
}
