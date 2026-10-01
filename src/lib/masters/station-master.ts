import type { PatternCostMap, StationCostRecord } from "@/types/master";
import { toPerCostYen } from "@/lib/utils/per-cost";
import { getMasterData } from "./load-json";

/**
 * 人口マスタ（area_target_master）のエリア名 → 局コストマスタ（station_cost_master）のエリア名
 */
const COST_AREA_ALIAS: Record<string, string> = {
  宮城: "仙台",
  東京: "関東",
  群馬: "関東",
  埼玉: "関東",
  栃木: "関東",
  千葉: "関東",
  神奈川: "関東",
  名古屋: "名古屋",
  岐阜: "名古屋",
  三重: "名古屋",
  大阪: "関西",
  滋賀: "関西",
  京都: "関西",
  兵庫: "関西",
  奈良: "関西",
  和歌山: "関西",
  "岡山・香川": "岡・高",
};

export function resolveCostArea(area: string): string {
  return COST_AREA_ALIAS[area] ?? area;
}

type PatternCostKey = keyof PatternCostMap;

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
 * 局パーコスト（円/GRP、円単位の整数）
 * 個人ターゲットは person_cost、世帯は household_cost を使用。マスタの小数は四捨五入する。
 */
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
  return toPerCostYen(map[key]);
}

export function listStationCostRows(area: string): StationCostRecord[] {
  const costArea = resolveCostArea(area);
  return getMasterData().station_cost_master.filter((r) => r.area === costArea);
}

export function resolveStationPerCost(
  area: string,
  station: string,
  patternKey: string,
  target: string,
  overrides?: Record<string, number>,
): number {
  const override = toPerCostYen(overrides?.[station] ?? 0);
  if (override > 0) {
    return override;
  }
  return getStationPerCost(area, station, patternKey, target);
}
