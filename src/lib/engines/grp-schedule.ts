export type GrpDistributionPreset = "even" | "front_heavy" | "back_heavy";

/** プランニングの期間粒度 */
export type PlanningGranularity = "week" | "month";

/** 1か月あたりの週数（52.14週 ÷ 12か月）。industry_coefficients.json の period_conversion と同じ値 */
export const WEEKS_PER_MONTH = 4.345;

/** 期間数の上限（週次52週／月次24か月） */
export const MAX_CAMPAIGN_PERIODS: Record<PlanningGranularity, number> = {
  week: 52,
  month: 24,
};

export function normalizeGrpDistribution(
  value: string | undefined,
): GrpDistributionPreset {
  if (value === "front_heavy" || value === "lump_sum") return "front_heavy";
  if (value === "back_heavy") return "back_heavy";
  return "even";
}

export function normalizePlanningGranularity(
  value: string | null | undefined,
): PlanningGranularity {
  return value === "month" ? "month" : "week";
}

export function clampCampaignPeriods(
  periods: number,
  granularity: PlanningGranularity,
): number {
  const rounded = Number.isFinite(periods) ? Math.round(periods) : 1;
  return Math.min(MAX_CAMPAIGN_PERIODS[granularity], Math.max(1, rounded));
}

/** 期間数を別粒度の期間数へ換算（週⇄月、4.345週/月） */
export function convertPeriodCount(
  periods: number,
  from: PlanningGranularity,
  to: PlanningGranularity,
): number {
  if (from === to) return clampCampaignPeriods(periods, to);
  const weeks = from === "week" ? periods : periods * WEEKS_PER_MONTH;
  return clampCampaignPeriods(
    to === "week" ? weeks : weeks / WEEKS_PER_MONTH,
    to,
  );
}

/** 期間数を週数に換算（週モードはそのまま、月モードは 月数×4.345 を四捨五入） */
export function periodsToWeeks(
  periods: number,
  granularity: PlanningGranularity,
): number {
  return granularity === "week"
    ? periods
    : Math.max(1, Math.round(periods * WEEKS_PER_MONTH));
}

export function periodUnitLabel(granularity: PlanningGranularity): string {
  return granularity === "month" ? "月" : "週";
}

/** 期間の表示（「4週」「3か月」）。旧データ（campaignWeeks のみ）にも対応 */
export function describeCampaignPeriod(input: {
  planningGranularity?: string | null;
  campaignPeriods?: number;
  campaignWeeks: number;
}): string {
  const granularity = normalizePlanningGranularity(input.planningGranularity);
  const periods =
    input.campaignPeriods ??
    convertPeriodCount(input.campaignWeeks, "week", granularity);
  return `${periods}${granularity === "month" ? "か月" : "週"}`;
}

/** 「第n週」「第nか月」形式のラベル（index は 0 始まり） */
export function periodLabel(
  index: number,
  granularity: PlanningGranularity,
): string {
  return granularity === "month" ? `第${index + 1}月` : `第${index + 1}週`;
}

/** 期間前半／後半に配る割合（前厚 6:4／後厚 4:6） */
const PRESET_HALF_SHARES: Record<GrpDistributionPreset, readonly [number, number]> = {
  even: [0.5, 0.5],
  front_heavy: [0.6, 0.4],
  back_heavy: [0.4, 0.6],
};

/**
 * プリセット配分で期間別GRPを作る。
 * 配分はキャンペーン期間（0〜1に正規化した時間軸）上の投下密度として定義し、各期間の区間で積分する。
 * 期間数が奇数でも前半・後半の比が保たれ、週次⇄月次で同じ形状になる。
 */
export function buildPresetGrpSchedule(
  totalGrp: number,
  periods: number,
  preset: GrpDistributionPreset,
): number[] {
  const count = Math.max(1, Math.round(periods));
  if (preset === "even" || count === 1) {
    return Array.from({ length: count }, () => totalGrp / count);
  }

  const [firstShare, secondShare] = PRESET_HALF_SHARES[preset];
  const schedule = Array.from({ length: count }, (_, index) => {
    const start = index / count;
    const end = (index + 1) / count;
    const firstPart = Math.max(0, Math.min(end, 0.5) - start);
    const secondPart = Math.max(0, end - Math.max(start, 0.5));
    return totalGrp * 2 * (firstShare * firstPart + secondShare * secondPart);
  });

  const drift = totalGrp - grpScheduleSum(schedule);
  schedule[schedule.length - 1] += drift;
  return schedule;
}

/** @deprecated buildPresetGrpSchedule を使用（週次専用だった旧名） */
export const buildPresetWeeklyGrpSchedule = buildPresetGrpSchedule;

export function grpScheduleSum(schedule: number[]): number {
  return schedule.reduce((a, b) => a + b, 0);
}

export function isGrpScheduleValid(
  schedule: number[],
  totalGrp: number,
  tolerance = 1,
): boolean {
  return Math.abs(grpScheduleSum(schedule) - totalGrp) < tolerance;
}

function sanitizeSchedule(schedule: readonly number[]): number[] {
  return schedule.map((value) =>
    Number.isFinite(value) && value > 0 ? value : 0,
  );
}

/**
 * 合計を total に合わせて比例スケールする（形状を保つ）。
 * 全期間0の場合は均等配分にする。
 */
export function rescaleSchedule(
  schedule: readonly number[],
  total: number,
): number[] {
  const clean = sanitizeSchedule(schedule);
  if (clean.length === 0) return [];
  const target = Math.max(0, total);
  const sum = grpScheduleSum(clean);
  if (sum <= 0) {
    return clean.map(() => target / clean.length);
  }
  return clean.map((value) => (value * target) / sum);
}

/**
 * 期間数を変えて配分を作り直す（面積保存リサンプリング）。
 * 旧配列を時間軸上の区分一定の投下密度とみなし、新しい区間との重なりで按分するため、
 * 合計GRPと前厚・後厚などの形状が保たれる。
 */
export function resampleSchedule(
  schedule: readonly number[],
  newLength: number,
): number[] {
  const m = Math.max(1, Math.round(newLength));
  const clean = sanitizeSchedule(schedule);
  const n = clean.length;
  if (n === 0) return Array.from({ length: m }, () => 0);
  if (n === m) return clean;

  const out = Array.from({ length: m }, () => 0);
  for (let i = 0; i < n; i += 1) {
    const start = i / n;
    const end = (i + 1) / n;
    const jStart = Math.floor(start * m);
    const jEnd = Math.min(m - 1, Math.ceil(end * m) - 1);
    for (let j = jStart; j <= jEnd; j += 1) {
      const overlap = Math.min(end, (j + 1) / m) - Math.max(start, j / m);
      if (overlap > 0) {
        out[j] += clean[i] * overlap * n;
      }
    }
  }
  return out;
}

function formatGrp1(value: number): string {
  return (Math.round(value * 10) / 10).toLocaleString("ja-JP");
}

/**
 * 総GRPを現行の期間配分比で割り付けたときの要約（リーチカーブのツールチップ用）。
 * 例: "4週: 25 / 25 / 25 / 25"、期間が多い場合は "12か月: 平均 20/月（16〜24）"
 */
export function summarizePeriodAllocation(
  schedule: readonly number[],
  totalGrp: number,
  granularity: PlanningGranularity,
  maxListed = 6,
): string | null {
  const n = schedule.length;
  if (n === 0) return null;
  const scaled = rescaleSchedule(schedule, totalGrp);
  const countLabel = `${n}${granularity === "month" ? "か月" : "週"}`;
  if (n <= maxListed) {
    return `${countLabel}: ${scaled.map(formatGrp1).join(" / ")}`;
  }
  const min = Math.min(...scaled);
  const max = Math.max(...scaled);
  const range =
    Math.abs(max - min) < 0.05 ? "" : `（${formatGrp1(min)}〜${formatGrp1(max)}）`;
  return `${countLabel}: 平均 ${formatGrp1(totalGrp / n)}/${periodUnitLabel(granularity)}${range}`;
}

/**
 * 計算に使う期間別GRP（入力GRP単位、合計 = totalGrp）。
 * 手入力配分は「形状」として扱い、合計を totalGrp に揃える。長さが期間数と違えば面積保存で合わせる。
 */
export function resolvePeriodGrpSchedule(params: {
  totalGrp: number;
  periods: number;
  distribution: GrpDistributionPreset;
  customPeriodGrp?: readonly number[] | null;
  manualEnabled?: boolean;
}): number[] {
  const periods = Math.max(1, Math.round(params.periods));
  if (params.manualEnabled && params.customPeriodGrp?.length) {
    const fitted =
      params.customPeriodGrp.length === periods
        ? [...params.customPeriodGrp]
        : resampleSchedule(params.customPeriodGrp, periods);
    return rescaleSchedule(fitted, params.totalGrp);
  }
  return buildPresetGrpSchedule(params.totalGrp, periods, params.distribution);
}
