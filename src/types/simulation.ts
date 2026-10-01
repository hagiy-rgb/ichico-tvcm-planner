import type { OptimalGrpResult } from "@/lib/engines/optimizer";
import type {
  AwarenessCurvePoint,
  AwarenessZone,
} from "@/lib/engines/awareness-engine";
import type {
  StationGrpAllocation,
  StationReachRow,
} from "@/lib/engines/station-engine";
import type { SimulationCoefficients } from "@/lib/engines/coefficient-engine";
import type { FunnelStage } from "@/lib/engines/coefficient-engine";
import type {
  GrpDistributionPreset,
  PlanningGranularity,
} from "@/lib/engines/grp-schedule";
import type { CreativePattern } from "@/types/creative-pattern";
import type { WebReplaceSuggestion } from "@/types/web-replace";

/** @deprecated CSV互換 */
export type LegacyGrpAllocation = "lump_sum" | "even_weekly";

export type PrecisionLevel = "standard" | "high" | "verified";

export type StationBudgetBreakdown = {
  station: string;
  displayName: string;
  grp: number;
  grpShare: number;
  perCost: number;
  /** 局出稿金額 = 局GRP × 局パーコスト（円） */
  budget: number;
  /** 総額に対する割合（%） */
  budgetSharePercent: number;
  /** 目安1本単価（円）。未入力なら null */
  spotUnitPrice: number | null;
  /** 目安出稿本数 = 局出稿金額 ÷ 目安1本単価 */
  estimatedSpots: number | null;
};

export type SimulationInput = {
  area: string;
  target: string;
  industryCode: string;
  creativePattern: CreativePattern;
  coefficients: SimulationCoefficients;
  funnelStage: FunnelStage;
  /** キャンペーン合計GRP（手入力配分時は期間別GRPの合計と一致させる） */
  grp: number;
  /** 期間粒度（未指定は週次） */
  planningGranularity?: PlanningGranularity;
  /** 期間数（週数または月数）。正規化で必ず設定する */
  campaignPeriods?: number;
  /** 出稿週数。週次では campaignPeriods と同値、月次では 月数×4.345 の概算（互換・表示用） */
  campaignWeeks: number;
  grpDistribution: GrpDistributionPreset;
  /** @deprecated 旧プラン互換 */
  grpAllocation?: LegacyGrpAllocation;
  /** 期間別GRP（入力GRP単位、長さ = campaignPeriods）。manualGrpEnabled 時のみ使用 */
  customPeriodGrp?: number[] | null;
  /** @deprecated 週次の旧手入力配列。正規化で customPeriodGrp へ移す */
  customWeeklyGrp?: number[] | null;
  manualGrpEnabled?: boolean;
  selectedStations: string[];
  stationDisplayNames?: Record<string, string>;
  /** 局別パーコストの上書き（円/GRP、整数） */
  stationPerCosts?: Record<string, number>;
  /** 局へのGRP按分方式（未指定は cost_weighted） */
  stationGrpAllocation?: StationGrpAllocation;
  /**
   * 手入力のGRP配分比率（0–100のパーセント想定、または任意の正の重み）。
   * allocation=manual のとき正規化して使う。
   */
  stationManualGrpShares?: Record<string, number>;
  /** 局別・目安1本単価（円）。出稿金額÷本単価で目安本数を算出 */
  stationSpotUnitPrices?: Record<string, number>;
  /**
   * web動画広告のターゲットリーチ人数単価（円/人）。
   * 入力時はTVのリーチ人数単価と比較してリプレイス提案を出す。
   */
  webVideoReachUnitPriceYen?: number | null;
  cmLength: 15 | 30 | 60;
  daypartsId?: string | null;
};

export type ReachCurvePoint = {
  grp: number;
  /** リーチ率（小数 0–1）。表示層でのみ ×100 して%に変換する */
  reachRate: number;
  /** リーチ人数（人） */
  reachCount: number;
  /** リーチ単価（円/リーチ率1%） */
  reachUnitPrice?: number;
  /** リーチ人数単価（円/人）= 出稿金額 ÷ リーチ人数 */
  reachPersonUnitPrice?: number;
};

export type SimulationResults = {
  population: number;
  kIndustry: number;
  kPatternCoefficient: number;
  kEffective: number;
  lambda: number;
  lambdaWeekly: number;
  planningGranularity: PlanningGranularity;
  campaignPeriods: number;
  /** 1期間あたりの残存係数（週次 λ_w、月次 λ_m = λ_w^4.345） */
  lambdaPeriod: number;
  /** 当期効果の期間換算係数（週次 1、月次は期間内減衰補正） */
  periodImpactFactor: number;
  /** 計算に使った期間別GRP（入力GRP単位、合計 = grp） */
  periodGrpSchedule: number[];
  /** 最大到達認知率（%） */
  maxAwareness: number;
  /** 認知率の半飽和点 K（Adstock） */
  halfSaturationAdstock: number;
  funnelStage: FunnelStage;
  patternLabel: string;
  reachRate: number;
  reachCount: number;
  averageStationReachRate: number;
  stationReachRows: StationReachRow[];
  stationGrpAllocation: StationGrpAllocation;
  /** 局別出稿金額・割合・目安本数 */
  stationBudgetBreakdown: StationBudgetBreakdown[];
  optimalGrp: OptimalGrpResult;
  /** 入力GRPあたり出稿単価（円/GRP）。局GRP配分で加重し、CM秒数補正済み */
  perCost: number;
  /** 出稿総額 = Σ(局GRP × 局パーコスト)（円） */
  totalBudget: number;
  cpm: number;
  /** リーチ単価（円/リーチ率1%）= 出稿総額 ÷ リーチ率[%] */
  reachUnitPrice: number;
  /** リーチ人数単価（円/人）= 出稿総額 ÷ リーチ人数 */
  reachPersonUnitPrice: number;
  /**
   * ターゲット表示単価（円/回）= 出稿総額 ÷ ((GRP/100) × ターゲット人口)
   */
  displayUnitPrice: number;
  /** リーチ千人あたりコスト（円/リーチ千人）。方式Aと同じ次元。リーチ0なら Infinity */
  costPerThousandReached: number;
  awarenessRate: number;
  finalAdstock: number;
  /** 最終認知率 / MaxAwareness（0–1） */
  awarenessSaturationRatio: number;
  awarenessZone: AwarenessZone;
  precision: PrecisionLevel;
  kPatternSource: "preset" | "dayparts";
  daypartsLabel?: string;
  reachCurve: ReachCurvePoint[];
  awarenessCurve: AwarenessCurvePoint[];
  /** web動画へのリプレイス提案（単価未入力なら null） */
  webReplace: WebReplaceSuggestion | null;
};
