import { PRESET_JACCARD_THRESHOLD } from "@/lib/constants/model-constants";
import { getPatternDefinitions } from "@/lib/masters/load-json";
import type { PatternBlock, PatternPreset } from "@/types/master";
import type { PatternPresetName } from "@/types/creative-pattern";

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"] as const;

const WEEKDAY_GROUP_DAYS: Record<string, readonly string[]> = {
  ALL: WEEKDAYS,
  WEEKDAY: ["月", "火", "水", "木", "金"],
  WEEKEND: ["土", "日"],
  月: ["月"],
  火: ["火"],
  水: ["水"],
  木: ["木"],
  金: ["金"],
  土: ["土"],
  日: ["日"],
};

/** "07:00" / "29:00" を 0〜1440 分に変換（29:00 = 翌5:00） */
export function parseTimeToMinutes(time: string): number {
  const [hourPart, minutePart] = time.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart ?? 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    throw new Error(`時刻形式が不正です: ${time}`);
  }
  let total = hour * 60 + minute;
  if (hour >= 24) {
    total = (hour - 24) * 60 + minute + 24 * 60;
  }
  return total;
}

function normalizeBlocks(blocks: PatternBlock[]): PatternBlock[] {
  return blocks
    .map((block) => ({
      weekday_group: block.weekday_group,
      time_slots: [...block.time_slots]
        .map((slot) => ({ start: slot.start, end: slot.end }))
        .sort((a, b) => a.start.localeCompare(b.start)),
    }))
    .sort((a, b) => a.weekday_group.localeCompare(b.weekday_group));
}

export function blocksEqual(a: PatternBlock[], b: PatternBlock[]): boolean {
  const left = normalizeBlocks(a);
  const right = normalizeBlocks(b);
  return JSON.stringify(left) === JSON.stringify(right);
}

export function resolveWeekdays(weekdayGroup: string): string[] {
  const days = WEEKDAY_GROUP_DAYS[weekdayGroup];
  if (!days) {
    return [weekdayGroup];
  }
  return [...days];
}

/** 曜日×分（5:00起点の1440分）の集合を構築 */
export function expandBlocksToCellKeys(blocks: PatternBlock[]): Set<string> {
  const cells = new Set<string>();
  for (const block of blocks) {
    const days = resolveWeekdays(block.weekday_group);
    for (const day of days) {
      for (const slot of block.time_slots) {
        const start = parseTimeToMinutes(slot.start);
        const end = parseTimeToMinutes(slot.end);
        for (let minute = start; minute < end; minute += 30) {
          cells.add(`${day}:${minute}`);
        }
      }
    }
  }
  return cells;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) {
    return 1;
  }
  let intersection = 0;
  for (const key of a) {
    if (b.has(key)) {
      intersection += 1;
    }
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function detectPresetFromBlocks(blocks: PatternBlock[]): PatternPresetName {
  const { patterns } = getPatternDefinitions();
  const current = expandBlocksToCellKeys(blocks);

  for (const key of ["全日", "ヨの字", "コの字", "逆L", "一の字"] as const) {
    const preset = patterns[key];
    if (!preset) {
      continue;
    }
    if (blocksEqual(blocks, preset.default_blocks)) {
      return key;
    }
    const presetCells = expandBlocksToCellKeys(preset.default_blocks);
    if (jaccardSimilarity(current, presetCells) > PRESET_JACCARD_THRESHOLD) {
      return key;
    }
  }

  return "カスタム";
}

/**
 * マトリクス編集後のプリセット名。30分セル集合がマスタと完全一致すればそのプリセット、
 * 1セルでも違えばカスタム（ブロックの表現形式＝曜日グループか曜日別かは問わない）。
 */
export function detectPresetNameFromBlocks(
  blocks: PatternBlock[],
): PatternPresetName {
  const { patterns } = getPatternDefinitions();
  const current = expandBlocksToCellKeys(blocks);

  for (const key of ["全日", "ヨの字", "コの字", "逆L", "一の字"] as const) {
    const preset = patterns[key];
    if (!preset) {
      continue;
    }
    const presetCells = expandBlocksToCellKeys(preset.default_blocks);
    if (
      presetCells.size === current.size &&
      [...presetCells].every((cell) => current.has(cell))
    ) {
      return key;
    }
  }

  return "カスタム";
}

export function getPresetBlocks(presetName: PatternPresetName): PatternBlock[] {
  const preset = getPatternDefinitions().patterns[presetName];
  if (!preset?.default_blocks?.length) {
    return [];
  }
  return preset.default_blocks.map((block) => ({
    weekday_group: block.weekday_group,
    time_slots: block.time_slots.map((slot) => ({
      start: slot.start,
      end: slot.end,
    })),
  }));
}

/**
 * カスタム絵柄の k 補正係数を、JSON プリセットとの類似度加重平均で推定
 */
export function estimatePatternCoefficient(blocks: PatternBlock[]): number {
  const cells = expandBlocksToCellKeys(blocks);
  if (cells.size === 0) {
    return 1;
  }

  const presets = Object.entries(getPatternDefinitions().patterns).filter(
    ([key, preset]) =>
      key !== "カスタム" &&
      typeof preset.default_coefficient_vs_average === "number",
  );

  let weighted = 0;
  let weightSum = 0;
  for (const [, preset] of presets) {
    const typed = preset as PatternPreset;
    const score = jaccardSimilarity(
      cells,
      expandBlocksToCellKeys(typed.default_blocks),
    );
    if (score <= 0 || typed.default_coefficient_vs_average == null) {
      continue;
    }
    weighted += score * typed.default_coefficient_vs_average;
    weightSum += score;
  }

  return weightSum > 0 ? weighted / weightSum : 1;
}

export function resolvePatternCoefficient(
  presetName: PatternPresetName,
  blocks: PatternBlock[],
): number {
  if (presetName !== "カスタム") {
    const preset = getPatternDefinitions().patterns[presetName];
    if (preset?.default_coefficient_vs_average != null) {
      return preset.default_coefficient_vs_average;
    }
  }
  return estimatePatternCoefficient(blocks);
}

/** コストマスタ参照用に最も近いプリセットキーを返す */
export function resolveCostPatternKey(
  presetName: PatternPresetName,
  blocks: PatternBlock[],
): keyof import("@/types/master").PatternCostMap {
  if (presetName !== "カスタム") {
    return presetName as keyof import("@/types/master").PatternCostMap;
  }

  const cells = expandBlocksToCellKeys(blocks);
  let bestKey: keyof import("@/types/master").PatternCostMap = "全日";
  let bestScore = -1;

  for (const key of ["全日", "ヨの字", "コの字", "逆L"] as const) {
    const preset = getPatternDefinitions().patterns[key];
    if (!preset) {
      continue;
    }
    const score = jaccardSimilarity(
      cells,
      expandBlocksToCellKeys(preset.default_blocks),
    );
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  return bestKey;
}

export function isMinuteInBlocks(
  weekday: string,
  minute: number,
  blocks: PatternBlock[],
): boolean {
  return expandBlocksToCellKeys(blocks).has(`${weekday}:${minute}`);
}
