import {
  getStationPerCost,
  listStationCostRows,
} from "@/lib/masters/station-master";
import { resolveCostPatternKey } from "@/lib/engines/creative-pattern-engine";
import type { CreativePattern } from "@/types/creative-pattern";

export const TX_ENABLED_AREAS = new Set([
  "関東",
  "東京",
  "関西",
  "大阪",
  "名古屋",
  "中京",
  "福岡",
  "北海道",
  "岡山・香川",
]);

export type NetworkCode = "N" | "J" | "C" | "E" | "T";

export const NETWORK_SERIES: Array<{
  code: NetworkCode;
  label: string;
  description: string;
}> = [
  { code: "N", label: "NTV系列", description: "日本テレビ系" },
  { code: "J", label: "TBS系列", description: "TBS系" },
  { code: "C", label: "CX系列", description: "フジテレビ系" },
  { code: "E", label: "EX系列", description: "テレビ朝日系" },
  { code: "T", label: "TX系列", description: "テレビ東京系" },
];

export type StationNetworkRow = {
  station: string;
  network: string;
  isNhk: boolean;
};

export function areaHasTxSeries(area: string): boolean {
  return TX_ENABLED_AREAS.has(area);
}

export function listStationNetworkRows(area: string): StationNetworkRow[] {
  return listStationCostRows(area).map((row) => ({
    station: row.station,
    network: row.network,
    isNhk: isNhkStation(row.station, row.network),
  }));
}

export function isNhkStation(station: string, network: string): boolean {
  const upper = station.toUpperCase();
  return (
    upper.includes("NHK") ||
    network === "NHK" ||
    station.includes("総合") ||
    station.includes("Ｅテレ") ||
    station.includes("Eテレ")
  );
}

export function getNetworkLabel(network: string): string {
  const found = NETWORK_SERIES.find((s) => s.code === network);
  return found?.label ?? network;
}

export function getDefaultDisplayName(station: string): string {
  return station;
}

export function getDefaultPerCost(
  area: string,
  station: string,
  target: string,
  creativePattern: CreativePattern,
): number {
  const patternKey = resolveCostPatternKey(
    creativePattern.presetName,
    creativePattern.blocks,
  );
  return getStationPerCost(area, station, patternKey, target);
}

export function filterSelectedForArea(
  area: string,
  selected: string[],
): string[] {
  const valid = new Set(
    listStationNetworkRows(area).map((r) => r.station),
  );
  const hasTx = areaHasTxSeries(area);
  return selected.filter((st) => {
    if (!valid.has(st)) return false;
    const row = listStationNetworkRows(area).find((r) => r.station === st);
    if (row?.network === "T" && !hasTx) return false;
    return true;
  });
}
