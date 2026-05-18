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

export const CSV_EXPORT_VERSION = "1.0";
