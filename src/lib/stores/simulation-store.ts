import { create } from "zustand";
import {
  buildRecommendedCoefficients,
  type FunnelStage,
  type SimulationCoefficients,
} from "@/lib/engines/coefficient-engine";
import {
  detectPresetNameFromBlocks,
  getPresetBlocks,
} from "@/lib/engines/creative-pattern-engine";
import {
  buildPresetGrpSchedule,
  clampCampaignPeriods,
  convertPeriodCount,
  grpScheduleSum,
  normalizeGrpDistribution,
  normalizePlanningGranularity,
  periodsToWeeks,
  rescaleSchedule,
  resampleSchedule,
  type GrpDistributionPreset,
  type PlanningGranularity,
} from "@/lib/engines/grp-schedule";
import {
  buildReachCurvesForTargets,
  type TargetReachCurveSeries,
} from "@/lib/engines/reach-curve-builder";
import {
  buildLeverageAnalysis,
  type LeverageAnalysis,
} from "@/lib/engines/sensitivity-engine";
import { listTargetsForArea } from "@/lib/masters/area-master";
import { listStationsForArea } from "@/lib/masters/station-master";
import {
  areaHasTxSeries,
  filterSelectedForArea,
} from "@/lib/masters/station-network";
import {
  runSimulation,
  type RunSimulationOptions,
} from "@/lib/engines/simulation-engine";
import {
  optimizeStationBudgetForMaxReach,
  type ReachMaxMode,
} from "@/lib/engines/station-budget-optimizer";
import {
  DEFAULT_STATION_GRP_ALLOCATION,
  normalizeStationGrpAllocation,
  type StationGrpAllocation,
} from "@/lib/engines/station-engine";
import { saveSimulationDraft } from "@/lib/db/app-db";
import { resolveDaypartsDataset } from "@/lib/stores/dayparts-store";
import {
  normalizePerCostOverrides,
  toPerCostYen,
} from "@/lib/utils/per-cost";
import type { CreativePattern, PatternPresetName } from "@/types/creative-pattern";
import type { PatternBlock } from "@/types/master";
import type { SimulationInput, SimulationResults } from "@/types/simulation";

/** 入力変更から再計算までのデバウンス時間（入力の反映自体は即時） */
const RECALC_DEBOUNCE_MS = 300;
/** 主計算のあとに感度・マルチカーブを遅延させる時間 */
const DERIVED_DEFER_MS = 50;

type SimulationState = {
  input: SimulationInput;
  results: SimulationResults | null;
  /** 直近の計算失敗の原因メッセージ（成功時は null） */
  calcError: string | null;
  /** デバウンス待ち・計算中フラグ */
  isCalculating: boolean;
  /** 起動時ドラフト復元の状態 */
  hydrationStatus: "pending" | "ready";
  /** 感度分析の遅延計算中 */
  leveragePending: boolean;
  /** 感度分析（Tornado/Waterfall/洞察）。results 更新時に一度だけ計算 */
  leverage: LeverageAnalysis | null;
  /** 感度分析の対象ターゲット */
  analysisTarget: string;
  /** リーチカーブに重ねるターゲット群 */
  curveTargets: string[];
  /** curveTargets ぶんのリーチカーブ（ストアで一元計算） */
  multiTargetCurves: TargetReachCurveSeries[];
  setArea: (area: string) => void;
  setTarget: (target: string) => void;
  /** Step1の複数ターゲット。先頭を主ターゲット、全体をカーブ対象にする */
  setTargets: (targets: string[]) => void;
  setIndustryCode: (code: string) => void;
  setFunnelStage: (stage: FunnelStage) => void;
  setCoefficients: (coefficients: Partial<SimulationCoefficients>) => void;
  resetCoefficientsToRecommended: () => void;
  applyPreset: (presetName: PatternPresetName) => void;
  setCreativeBlocks: (blocks: PatternBlock[]) => void;
  setGrp: (grp: number) => void;
  /** 出稿金額（円）からGRPを逆算して設定 */
  setTotalBudgetYen: (yen: number) => void;
  /** 固定予算でリーチ最大化となる局配分を適用（既定は実務寄り） */
  applyReachMaxStationAllocation: (mode?: ReachMaxMode) => void;
  setPlanningGranularity: (granularity: PlanningGranularity) => void;
  setCampaignPeriods: (periods: number) => void;
  setGrpDistribution: (preset: GrpDistributionPreset) => void;
  setManualGrpEnabled: (enabled: boolean) => void;
  /** 期間別GRPを手入力で設定（合計GRPは配列の合計に更新） */
  setCustomPeriodGrp: (schedule: number[]) => void;
  setSelectedStations: (stations: string[]) => void;
  toggleStation: (station: string) => void;
  setStationDisplayName: (station: string, name: string) => void;
  setStationPerCost: (station: string, perCost: number) => void;
  setStationGrpAllocation: (allocation: StationGrpAllocation) => void;
  setStationManualGrpShare: (station: string, sharePercent: number) => void;
  setStationSpotUnitPrice: (station: string, yen: number) => void;
  setWebVideoReachUnitPriceYen: (yen: number | null) => void;
  setCmLength: (length: 15 | 30 | 60) => void;
  setDaypartsId: (daypartsId: string | null) => void;
  setAnalysisTarget: (target: string) => void;
  setCurveTargets: (targets: string[]) => void;
  recalculate: () => void;
  loadInput: (input: SimulationInput) => void;
  /** IndexedDB ドラフト復元。ユーザーが先に編集していれば上書きしない */
  hydrateDraft: (input: SimulationInput | null) => void;
};

function createDefaultCreativePattern(): CreativePattern {
  return {
    presetName: "ヨの字",
    blocks: getPresetBlocks("ヨの字"),
  };
}

export function createDefaultInput(): SimulationInput {
  const creativePattern = createDefaultCreativePattern();
  return {
    area: "宮城",
    target: "個人全体",
    industryCode: "FMCG_FOOD",
    creativePattern,
    funnelStage: "awareness",
    coefficients: buildRecommendedCoefficients("FMCG_FOOD", "awareness"),
    grp: 100,
    planningGranularity: "week",
    campaignPeriods: 4,
    campaignWeeks: 4,
    grpDistribution: "even",
    customPeriodGrp: null,
    manualGrpEnabled: false,
    selectedStations: listStationsForArea("宮城"),
    stationDisplayNames: {},
    stationPerCosts: {},
    stationGrpAllocation: DEFAULT_STATION_GRP_ALLOCATION,
    stationManualGrpShares: {},
    stationSpotUnitPrices: {},
    webVideoReachUnitPriceYen: null,
    cmLength: 15,
    daypartsId: null,
  };
}

export function normalizeSimulationInput(
  input: SimulationInput,
): SimulationInput {
  const pattern = input.creativePattern;
  const presetName = pattern.presetName ?? "ヨの字";
  // カスタムで全枠を外した状態（空配列）も保持する。ヨの字へ戻すと
  // 「消したはずの枠が復活する」ため、フォールバックはブロック欠損時のみ。
  const blocks =
    presetName !== "カスタム"
      ? getPresetBlocks(presetName)
      : Array.isArray(pattern.blocks)
        ? pattern.blocks
        : getPresetBlocks("ヨの字");

  const grpDistribution = normalizeGrpDistribution(
    input.grpDistribution ?? input.grpAllocation,
  );

  const area = input.area ?? "宮城";
  let selectedStations = filterSelectedForArea(
    area,
    input.selectedStations?.length > 0
      ? input.selectedStations
      : listStationsForArea(area),
  );
  if (selectedStations.length === 0) {
    selectedStations = listStationsForArea(area).filter((st) => {
      const rows = filterSelectedForArea(area, [st]);
      return rows.length > 0;
    });
  }
  if (selectedStations.length === 0) {
    selectedStations = listStationsForArea(area);
  }

  const grp = Number.isFinite(input.grp) ? Math.max(0, input.grp) : 100;
  const planningGranularity = normalizePlanningGranularity(
    input.planningGranularity,
  );
  const campaignPeriods = clampCampaignPeriods(
    input.campaignPeriods ??
      convertPeriodCount(input.campaignWeeks ?? 4, "week", planningGranularity),
    planningGranularity,
  );
  const manualGrpEnabled = input.manualGrpEnabled ?? false;
  const rawCustom =
    input.customPeriodGrp ??
    (planningGranularity === "week" ? input.customWeeklyGrp : null) ??
    null;
  // 手入力配分は期間数に合わせて面積保存で伸縮し、合計を grp に揃える（grp が唯一の総量）
  const customPeriodGrp = manualGrpEnabled
    ? rescaleSchedule(
        rawCustom && rawCustom.length > 0
          ? resampleSchedule(rawCustom, campaignPeriods)
          : buildPresetGrpSchedule(grp, campaignPeriods, grpDistribution),
        grp,
      )
    : null;

  return {
    ...input,
    creativePattern: { ...pattern, blocks },
    grp,
    planningGranularity,
    campaignPeriods,
    campaignWeeks: periodsToWeeks(campaignPeriods, planningGranularity),
    grpDistribution,
    customPeriodGrp,
    customWeeklyGrp: undefined,
    manualGrpEnabled,
    selectedStations,
    stationDisplayNames: input.stationDisplayNames ?? {},
    stationPerCosts: normalizePerCostOverrides(input.stationPerCosts),
    stationGrpAllocation: normalizeStationGrpAllocation(
      input.stationGrpAllocation,
    ),
    stationManualGrpShares: normalizeShareMap(input.stationManualGrpShares),
    stationSpotUnitPrices: normalizePerCostOverrides(
      input.stationSpotUnitPrices,
    ),
    webVideoReachUnitPriceYen: normalizeOptionalPositive(
      input.webVideoReachUnitPriceYen,
    ),
    coefficients: normalizeCoefficients(
      input.coefficients,
      buildRecommendedCoefficients(
        input.industryCode ?? "FMCG_FOOD",
        input.funnelStage ?? "awareness",
      ),
    ),
    daypartsId: input.daypartsId ?? null,
  };
}

const COEFFICIENT_KEYS = [
  "lambdaWeekly",
  "alphaConversion",
  "maxAwareness",
  "halfSaturationAdstock",
  "kPoisson",
  "effectiveFrequency",
] as const satisfies readonly (keyof SimulationCoefficients)[];

/** 任意の正数マップ（0以下は除外） */
function normalizeShareMap(
  raw: Record<string, number> | undefined,
): Record<string, number> {
  const next: Record<string, number> = {};
  if (!raw) return next;
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      next[key] = value;
    }
  }
  return next;
}

function normalizeOptionalPositive(
  value: number | null | undefined,
): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/** 既知の係数キーのみを採用し、欠損・非数は推奨値で補う（旧プランの廃止キーを持ち込まない） */
function normalizeCoefficients(
  raw: Partial<SimulationCoefficients> | undefined,
  recommended: SimulationCoefficients,
): SimulationCoefficients {
  const coefficients = { ...recommended };
  for (const key of COEFFICIENT_KEYS) {
    const value = raw?.[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      coefficients[key] = value;
    }
  }
  return coefficients;
}

/** GRPの表示・保存精度（0.1） */
function roundGrp(value: number): number {
  return Math.round(value * 10) / 10;
}

type RecalcOutcome = {
  results: SimulationResults | null;
  error: string | null;
  options: RunSimulationOptions;
};

async function computeResults(input: SimulationInput): Promise<RecalcOutcome> {
  let options: RunSimulationOptions = {};
  try {
    options = { dayparts: await resolveDaypartsDataset(input.daypartsId) };
    return { results: runSimulation(input, options), error: null, options };
  } catch (e) {
    return {
      results: null,
      error: e instanceof Error ? e.message : String(e),
      options,
    };
  }
}

function computeLeverage(
  input: SimulationInput,
  results: SimulationResults | null,
  analysisTarget: string,
  options: RunSimulationOptions,
): LeverageAnalysis | null {
  if (!results) return null;
  try {
    if (analysisTarget === input.target) {
      return buildLeverageAnalysis(input, results, options);
    }
    const analysisInput = { ...input, target: analysisTarget };
    return buildLeverageAnalysis(
      analysisInput,
      runSimulation(analysisInput, options),
      options,
    );
  } catch {
    return null;
  }
}

function computeCurves(
  input: SimulationInput,
  curveTargets: string[],
  options: RunSimulationOptions,
): TargetReachCurveSeries[] {
  try {
    const targets = curveTargets.includes(input.target)
      ? curveTargets
      : [input.target, ...curveTargets];
    return buildReachCurvesForTargets(input, targets, options);
  } catch {
    return [];
  }
}

/** 直近の再計算で解決した dayparts 等（分析ターゲット・カーブ対象の切替時に再利用） */
let lastRunOptions: RunSimulationOptions = {};

function syncPatternPreset(
  pattern: CreativePattern,
  blocks: PatternBlock[],
): CreativePattern {
  const presetName = detectPresetNameFromBlocks(blocks);
  return { presetName, blocks };
}

// 再計算の世代管理: 最後に発行した計算のみ結果を反映する
let recalcGeneration = 0;
let recalcTimer: ReturnType<typeof setTimeout> | null = null;
let derivedTimer: ReturnType<typeof setTimeout> | null = null;
/** ユーザーが入力を変更済みならドラフト復元で上書きしない */
let userEdited = false;

export const useSimulationStore = create<SimulationState>((set, get) => {
  const withRecalc = (
    input: SimulationInput,
    options?: { fromHydrate?: boolean },
  ): void => {
    if (!options?.fromHydrate) {
      userEdited = true;
    }
    const normalized = normalizeSimulationInput(input);
    set({ input: normalized, isCalculating: true, leveragePending: true });
    if (!options?.fromHydrate) {
      void saveSimulationDraft(normalized);
    }

    const generation = ++recalcGeneration;
    if (recalcTimer) {
      clearTimeout(recalcTimer);
    }
    if (derivedTimer) {
      clearTimeout(derivedTimer);
    }
    recalcTimer = setTimeout(() => {
      void computeResults(normalized).then(({ results, error, options: runOptions }) => {
        if (generation !== recalcGeneration) {
          return; // 後続の入力による計算が発行済みなので破棄
        }
        lastRunOptions = runOptions;
        const state = get();
        const validTargets = listTargetsForArea(normalized.area);
        const analysisTarget = validTargets.includes(state.analysisTarget)
          ? state.analysisTarget
          : normalized.target;
        const curveTargets = state.curveTargets.filter((t) =>
          validTargets.includes(t),
        );
        const nextCurveTargets = curveTargets.includes(normalized.target)
          ? curveTargets
          : [normalized.target, ...curveTargets];
        set({
          results,
          calcError: error,
          isCalculating: false,
          analysisTarget,
          curveTargets: nextCurveTargets,
          leverage: null,
          leveragePending: Boolean(results),
          multiTargetCurves: [],
        });

        derivedTimer = setTimeout(() => {
          if (generation !== recalcGeneration) return;
          set({
            leverage: computeLeverage(
              normalized,
              results,
              analysisTarget,
              runOptions,
            ),
            multiTargetCurves: results
              ? computeCurves(normalized, nextCurveTargets, runOptions)
              : [],
            leveragePending: false,
          });
        }, DERIVED_DEFER_MS);
      });
    }, RECALC_DEBOUNCE_MS);
  };

  const defaultInput = createDefaultInput();

  return {
    input: defaultInput,
    results: null,
    calcError: null,
    isCalculating: false,
    hydrationStatus: "pending",
    leveragePending: false,
    leverage: null,
    analysisTarget: defaultInput.target,
    curveTargets: [defaultInput.target],
    multiTargetCurves: [],

    setArea: (area) => {
      const stations = listStationsForArea(area);
      const hasTx = areaHasTxSeries(area);
      const selected = stations.filter((st) => {
        if (!hasTx) {
          const row = filterSelectedForArea(area, [st]);
          return row.length > 0;
        }
        return true;
      });
      const targets = listTargetsForArea(area);
      const target = targets.includes(get().input.target)
        ? get().input.target
        : (targets[0] ?? get().input.target);
      const input = {
        ...get().input,
        area,
        target,
        selectedStations: selected.length > 0 ? selected : stations,
        stationDisplayNames: {},
        stationPerCosts: {},
        stationManualGrpShares: {},
        stationSpotUnitPrices: {},
      };
      withRecalc(input);
    },
    setTarget: (target) => {
      withRecalc({ ...get().input, target });
      set({
        curveTargets: get().curveTargets.includes(target)
          ? get().curveTargets
          : [target, ...get().curveTargets],
        analysisTarget: target,
      });
    },
    setTargets: (targets) => {
      const valid = targets.filter(Boolean);
      if (valid.length === 0) return;
      const primary = valid[0];
      withRecalc({ ...get().input, target: primary });
      set({
        curveTargets: valid,
        analysisTarget: primary,
      });
    },
    setIndustryCode: (industryCode) => {
      const input = {
        ...get().input,
        industryCode,
        coefficients: buildRecommendedCoefficients(
          industryCode,
          get().input.funnelStage,
        ),
      };
      withRecalc(input);
    },
    setFunnelStage: (funnelStage) => {
      const input = {
        ...get().input,
        funnelStage,
        coefficients: buildRecommendedCoefficients(
          get().input.industryCode,
          funnelStage,
        ),
      };
      withRecalc(input);
    },
    setCoefficients: (partial) => {
      withRecalc({
        ...get().input,
        coefficients: { ...get().input.coefficients, ...partial },
      });
    },
    resetCoefficientsToRecommended: () => {
      const { industryCode, funnelStage } = get().input;
      withRecalc({
        ...get().input,
        coefficients: buildRecommendedCoefficients(industryCode, funnelStage),
      });
    },
    applyPreset: (presetName) => {
      const blocks = getPresetBlocks(presetName);
      withRecalc({ ...get().input, creativePattern: { presetName, blocks } });
    },
    setCreativeBlocks: (blocks) => {
      const creativePattern = syncPatternPreset(
        get().input.creativePattern,
        blocks,
      );
      withRecalc({ ...get().input, creativePattern });
    },
    setGrp: (grp) => {
      // 手入力配分中は正規化で期間別GRPが新しい合計へ比例スケールされる
      withRecalc({ ...get().input, grp: Math.max(0, roundGrp(grp)) });
    },
    setTotalBudgetYen: (yen) => {
      const amount = Number.isFinite(yen) ? Math.max(0, Math.round(yen)) : 0;
      const perCost = get().results?.perCost;
      if (perCost == null || !(perCost > 0)) {
        // 結果未算出時は現行GRPを維持し、次回計算後にユーザーが再入力
        return;
      }
      withRecalc({
        ...get().input,
        grp: roundGrp(amount / perCost),
      });
    },
    applyReachMaxStationAllocation: (mode = "practical") => {
      const { input, results } = get();
      const budget = results?.totalBudget ?? input.grp * (results?.perCost ?? 0);
      if (!(budget > 0)) return;
      const optimized = optimizeStationBudgetForMaxReach(input, budget, {
        mode,
      });
      if (!optimized) return;
      const percentShares: Record<string, number> = {};
      for (const [station, share] of Object.entries(optimized.shares)) {
        percentShares[station] = Math.round(share * 1000) / 10;
      }
      withRecalc({
        ...input,
        grp: roundGrp(optimized.totalGrp),
        stationGrpAllocation: "manual",
        stationManualGrpShares: percentShares,
      });
    },
    setPlanningGranularity: (planningGranularity) => {
      const current = get().input;
      const from = normalizePlanningGranularity(current.planningGranularity);
      if (from === planningGranularity) return;
      withRecalc({
        ...current,
        planningGranularity,
        campaignPeriods: convertPeriodCount(
          current.campaignPeriods ?? current.campaignWeeks,
          from,
          planningGranularity,
        ),
      });
    },
    setCampaignPeriods: (campaignPeriods) => {
      withRecalc({ ...get().input, campaignPeriods });
    },
    setGrpDistribution: (grpDistribution) => {
      withRecalc({
        ...get().input,
        grpDistribution,
        manualGrpEnabled: false,
      });
    },
    setManualGrpEnabled: (manualGrpEnabled) => {
      withRecalc({ ...get().input, manualGrpEnabled });
    },
    setCustomPeriodGrp: (schedule) => {
      const customPeriodGrp = schedule.map((value) =>
        Number.isFinite(value) ? Math.max(0, value) : 0,
      );
      withRecalc({
        ...get().input,
        customPeriodGrp,
        manualGrpEnabled: true,
        grp: roundGrp(grpScheduleSum(customPeriodGrp)),
      });
    },
    setSelectedStations: (selectedStations) => {
      if (selectedStations.length === 0) return;
      withRecalc({ ...get().input, selectedStations });
    },
    toggleStation: (station) => {
      const current = get().input.selectedStations;
      const next = current.includes(station)
        ? current.filter((s) => s !== station)
        : [...current, station];
      if (next.length === 0) return;
      withRecalc({ ...get().input, selectedStations: next });
    },
    setStationDisplayName: (station, name) => {
      const input = {
        ...get().input,
        stationDisplayNames: {
          ...get().input.stationDisplayNames,
          [station]: name,
        },
      };
      set({ input });
      void saveSimulationDraft(normalizeSimulationInput(input));
    },
    setStationPerCost: (station, perCost) => {
      // 0以下（空欄）は上書き解除＝マスタ値を使用
      withRecalc({
        ...get().input,
        stationPerCosts: {
          ...get().input.stationPerCosts,
          [station]: toPerCostYen(perCost),
        },
      });
    },
    setStationGrpAllocation: (stationGrpAllocation) => {
      withRecalc({ ...get().input, stationGrpAllocation });
    },
    setStationManualGrpShare: (station, sharePercent) => {
      const value = Number.isFinite(sharePercent)
        ? Math.max(0, sharePercent)
        : 0;
      withRecalc({
        ...get().input,
        stationGrpAllocation: "manual",
        stationManualGrpShares: {
          ...get().input.stationManualGrpShares,
          [station]: value,
        },
      });
    },
    setStationSpotUnitPrice: (station, yen) => {
      withRecalc({
        ...get().input,
        stationSpotUnitPrices: {
          ...get().input.stationSpotUnitPrices,
          [station]: toPerCostYen(yen),
        },
      });
    },
    setWebVideoReachUnitPriceYen: (yen) => {
      withRecalc({
        ...get().input,
        webVideoReachUnitPriceYen:
          yen == null || !Number.isFinite(yen) || yen <= 0 ? null : yen,
      });
    },
    setCmLength: (cmLength) => {
      withRecalc({ ...get().input, cmLength });
    },
    setDaypartsId: (daypartsId) => {
      withRecalc({ ...get().input, daypartsId });
    },
    setAnalysisTarget: (target) => {
      const { input, results } = get();
      set({
        analysisTarget: target,
        leverage: computeLeverage(input, results, target, lastRunOptions),
      });
    },
    setCurveTargets: (targets) => {
      const { input } = get();
      const next = targets.length > 0 ? targets : [input.target];
      set({
        curveTargets: next,
        multiTargetCurves: computeCurves(input, next, lastRunOptions),
      });
    },
    recalculate: () => {
      withRecalc(get().input);
    },
    loadInput: (raw) => {
      withRecalc(raw);
    },
    hydrateDraft: (raw) => {
      if (userEdited) {
        set({ hydrationStatus: "ready" });
        return;
      }
      const input = raw ?? createDefaultInput();
      withRecalc(input, { fromHydrate: true });
      set({ hydrationStatus: "ready" });
    },
  };
});
