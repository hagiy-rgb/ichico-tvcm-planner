import type { IndustryCoefficientsData } from "@/types/master";
import type { MasterData } from "@/types/master";
import type { PatternDefinitionsData } from "@/types/master";
import type { StationNameMappingData } from "@/types/master";

import industryCoefficientsJson from "@/data/industry_coefficients.json";
import masterDataJson from "@/data/master_data.json";
import patternDefinitionsJson from "@/data/pattern_definitions.json";
import stationNameMappingJson from "@/data/station_name_mapping.json";

function sanitizeMasterData(raw: MasterData): MasterData {
  const station_cost_master = raw.station_cost_master.filter(
    (row) =>
      row.area !== "エリア" &&
      typeof row.household_to_person_coefficient === "number",
  );
  return { ...raw, station_cost_master };
}

export function getMasterData(): MasterData {
  return sanitizeMasterData(masterDataJson as unknown as MasterData);
}

export function getIndustryCoefficients(): IndustryCoefficientsData {
  return industryCoefficientsJson as unknown as IndustryCoefficientsData;
}

export function getPatternDefinitions(): PatternDefinitionsData {
  const raw = patternDefinitionsJson as unknown as PatternDefinitionsData & {
    patterns: Record<string, PatternDefinitionsData["patterns"][string]>;
  };
  return { version: raw.version, patterns: raw.patterns };
}

export function getStationNameMapping(): StationNameMappingData {
  return stationNameMappingJson as unknown as StationNameMappingData;
}
