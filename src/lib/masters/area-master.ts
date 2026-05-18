import { getMasterData } from "./load-json";

const HEADER_AREA = "エリア";

export function listAreas(): string[] {
  const records = getMasterData().area_target_master;
  const areas = new Set<string>();
  for (const row of records) {
    if (row.area !== HEADER_AREA) {
      areas.add(row.area);
    }
  }
  return Array.from(areas).sort((a, b) => a.localeCompare(b, "ja"));
}

export function listTargetsForArea(area: string): string[] {
  const records = getMasterData().area_target_master;
  const targets = new Set<string>();
  for (const row of records) {
    if (row.area === area) {
      targets.add(row.target);
    }
  }
  return Array.from(targets).sort((a, b) => a.localeCompare(b, "ja"));
}

/** 視聴人口（人）。マスタは千人単位 */
export function getPopulation(area: string, target: string): number {
  const row = getMasterData().area_target_master.find(
    (r) => r.area === area && r.target === target,
  );
  if (!row) {
    throw new Error(`人口マスタが見つかりません: ${area} / ${target}`);
  }
  return row.population_thousand * 1000;
}

export function getAreaTargetRecord(area: string, target: string) {
  const row = getMasterData().area_target_master.find(
    (r) => r.area === area && r.target === target,
  );
  if (!row) {
    throw new Error(`エリア×ターゲットが見つかりません: ${area} / ${target}`);
  }
  return row;
}
