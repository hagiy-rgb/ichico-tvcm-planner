import type { GrpAllocation } from "@/lib/engines/awareness-engine";
import type { AwarenessCurvePoint } from "@/lib/engines/awareness-engine";
import type { OptimalGrpResult } from "@/lib/engines/optimizer";
import type { StationReachRow } from "@/lib/engines/station-engine";
import type { SimulationCoefficients } from "@/lib/engines/coefficient-engine";
import type { FunnelStage } from "@/lib/engines/coefficient-engine";
import type { CreativePattern } from "@/types/creative-pattern";

export type PrecisionLevel = "standard" | "high" | "verified";

export type SimulationInput = {
  area: string;
  target: string;
  industryCode: string;
  creativePattern: CreativePattern;
  coefficients: SimulationCoefficients;
  funnelStage: FunnelStage;
  grp: number;
  campaignWeeks: number;
  grpAllocation: GrpAllocation;
  selectedStations: string[];
  cmLength: 15 | 30 | 60;
  /** 曜日・時間区分インポートデータ（IndexedDB）への参照 */
  daypartsId?: string | null;
};

export type ReachCurvePoint = {
  grp: number;
  reachRate: number;
  reachCount: number;
};

export type SimulationResults = {
  population: number;
  kIndustry: number;
  kPatternCoefficient: number;
  kEffective: number;
  lambda: number;
  lambdaWeekly: number;
  alphaAwareness: number;
  funnelStage: FunnelStage;
  patternLabel: string;
  reachRate: number;
  reachCount: number;
  averageStationReachRate: number;
  stationReachRows: StationReachRow[];
  optimalGrp: OptimalGrpResult;
  perCost: number;
  totalBudget: number;
  cpm: number;
  reachUnitPrice: number;
  awarenessRate: number;
  finalAdstock: number;
  awarenessLinearWarning: boolean;
  awarenessSaturated: boolean;
  precision: PrecisionLevel;
  kPatternSource: "preset" | "dayparts";
  daypartsLabel?: string;
  reachCurve: ReachCurvePoint[];
  awarenessCurve: AwarenessCurvePoint[];
};
