export type AreaTargetRecord = {
  area: string;
  station_group: string;
  target: string;
  population_thousand: number;
};

export type StationPopulationRecord = {
  area: string;
  station: string;
  target: string;
  population_thousand: number;
};

export type PatternCostMap = {
  全日: number;
  ヨの字: number;
  コの字: number;
  逆L: number;
};

export type StationCostRecord = {
  area: string;
  station: string;
  network: string;
  household_to_person_coefficient: number;
  household_cost: PatternCostMap;
  person_cost: PatternCostMap;
};

export type PlanningBenchmark = {
  value: number;
  source: string;
  quality: string;
};

export type StationPopulationRow = {
  area: string;
  station: string;
  household_thousand?: number;
  person_total_thousand?: number;
};

export type MasterData = {
  version: string;
  source: string;
  extracted_at: string;
  area_target_master: AreaTargetRecord[];
  station_population_master?: StationPopulationRow[];
  station_cost_master: StationCostRecord[];
  planning_benchmarks?: {
    web_video_cpm_yen: PlanningBenchmark;
    station_inter_correlation_default: PlanningBenchmark;
  };
};

export type IndustryCoefficientRange = {
  min: number;
  typical: number;
  max: number;
  half_life_weeks?: number[];
  quality: string;
  source: string;
  unit?: string;
  note?: string;
};

export type IndustryRecord = {
  code: string;
  label: string;
  lambda_weekly: IndustryCoefficientRange;
  alpha_awareness: IndustryCoefficientRange;
  k_poisson: { value: number; quality: string; note?: string };
  funnel_adjust_lambda?: Record<string, number>;
};

export type FunnelMultipliersForLambda = {
  awareness: number;
  interest: number;
  consideration: number;
  intent: number;
  purchase: number;
  loyalty: number;
  source: string;
  quality: string;
};

export type AwarenessSaturationDefaults = {
  max_awareness: IndustryCoefficientRange;
  half_saturation_adstock: IndustryCoefficientRange;
};

export type ModelDefinition = {
  adstock?: string;
  awareness?: string;
  reach?: string;
  default_period?: string;
  alpha_conversion_default?: IndustryCoefficientRange;
  awareness_saturation_default?: AwarenessSaturationDefaults;
  half_life_formula?: string;
  period_conversion?: Record<string, string>;
};

export type IndustryCoefficientsData = {
  schema_version: string;
  industries: IndustryRecord[];
  model_definition?: ModelDefinition;
  funnel_multipliers_for_lambda?: FunnelMultipliersForLambda;
  global_caveats?: string[];
};

export type PatternTimeSlot = { start: string; end: string };

export type PatternBlock = {
  weekday_group: string;
  time_slots: PatternTimeSlot[];
};

export type PatternPreset = {
  label: string;
  description: string;
  default_blocks: PatternBlock[];
  cost_tier: string;
  default_coefficient_vs_average: number | null;
  note?: string;
};

export type PatternDefinitionsData = {
  version: string;
  patterns: Record<string, PatternPreset>;
};

export type StationNameMappingData = {
  version: string;
  mappings: Record<string, Record<string, string>>;
};
