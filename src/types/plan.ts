import type { SimulationInput, SimulationResults } from "@/types/simulation";

export type SavedPlanMeta = {
  name: string;
  clientName: string;
  projectName: string;
  contactPerson: string;
  memo: string;
};

export type SavedPlanRecord = {
  id: string;
  meta: SavedPlanMeta;
  savedAt: string;
  input: SimulationInput;
  results: SimulationResults;
};

export const MAX_COMPARE_PLANS = 4;

export const CSV_EXPORT_VERSION = "1.2";

/**
 * インポートを受け付けるバージョン（1.0はreachRateの単位表記なし、
 * 1.2で期間粒度・期間別GRP・絵柄セル・局別パーコスト上書きを追加）
 */
export const CSV_SUPPORTED_VERSIONS = ["1.0", "1.1", "1.2"];
