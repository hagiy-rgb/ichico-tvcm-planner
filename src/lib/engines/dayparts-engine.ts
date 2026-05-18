import {
  expandBlocksToCellKeys,
  parseTimeToMinutes,
  resolveWeekdays,
} from "@/lib/engines/creative-pattern-engine";
import {
  DAYPARTS_WEEKDAYS,
  type DaypartsData,
  type DaypartsHourRatings,
  type DaypartsWeekday,
} from "@/types/dayparts";
import type { PatternBlock } from "@/types/master";

function normalizeTargetKey(target: string): string {
  return target.replace(/\s+/g, "").toLowerCase();
}

function pickSheet(data: DaypartsData, target: string) {
  const key = normalizeTargetKey(target);
  const exact = data.sheets.find((s) => normalizeTargetKey(s.target) === key);
  if (exact) {
    return exact;
  }
  return (
    data.sheets.find((s) => normalizeTargetKey(s.target).includes(key)) ??
    data.sheets.find((s) => key.includes(normalizeTargetKey(s.target))) ??
    data.sheets[0]
  );
}

function findHourRatings(
  ratings: Record<string, DaypartsHourRatings>,
  minute: number,
): DaypartsHourRatings | undefined {
  for (const [timeLabel, hourRatings] of Object.entries(ratings)) {
    const start = parseTimeToMinutes(timeLabel);
    const end = start + 60;
    if (minute >= start && minute < end) {
      return hourRatings;
    }
  }
  return undefined;
}

function collectRatingsForStations(
  data: DaypartsData,
  target: string,
  stations: string[],
): number[] {
  const sheet = pickSheet(data, target);
  const values: number[] = [];
  const stationSet = new Set(stations);

  for (const block of sheet.blocks) {
    const canonical = block.stationNormalized ?? block.station;
    if (!stationSet.has(canonical) && !stationSet.has(block.station)) {
      continue;
    }
    for (const hourRatings of Object.values(block.ratings)) {
      for (const day of DAYPARTS_WEEKDAYS) {
        const v = hourRatings[day];
        if (v != null && v > 0) {
          values.push(v);
        }
      }
    }
  }

  return values;
}

function ratingAtCell(
  data: DaypartsData,
  target: string,
  stations: string[],
  weekday: string,
  minute: number,
): number | null {
  const sheet = pickSheet(data, target);
  const stationSet = new Set(stations);
  const dayKey = weekday as DaypartsWeekday;

  for (const block of sheet.blocks) {
    const canonical = block.stationNormalized ?? block.station;
    if (!stationSet.has(canonical) && !stationSet.has(block.station)) {
      continue;
    }
    const hourRow = findHourRatings(block.ratings, minute);
    if (!hourRow) {
      continue;
    }
    const val = hourRow[dayKey];
    if (val != null && val > 0) {
      return val;
    }
  }

  return null;
}

/**
 * 高精度モード: 絵柄セルの加重平均視聴率 / 全体平均視聴率
 */
export function computePatternCoefficientFromDayparts(
  data: DaypartsData,
  target: string,
  stations: string[],
  blocks: PatternBlock[],
): { coefficient: number; patternAverage: number; overallAverage: number } | null {
  if (stations.length === 0) {
    return null;
  }

  const overallValues = collectRatingsForStations(data, target, stations);
  if (overallValues.length === 0) {
    return null;
  }
  const overallAverage =
    overallValues.reduce((sum, v) => sum + v, 0) / overallValues.length;

  const patternValues: number[] = [];
  const cells = expandBlocksToCellKeys(blocks);

  for (const cellKey of cells) {
    const [weekday, minuteStr] = cellKey.split(":");
    const minute = Number(minuteStr);
    if (!weekday || !Number.isFinite(minute)) {
      continue;
    }
    for (const day of resolveWeekdays(weekday)) {
      const rating = ratingAtCell(data, target, stations, day, minute);
      if (rating != null) {
        patternValues.push(rating);
      }
    }
  }

  if (patternValues.length === 0) {
    return null;
  }

  const patternAverage =
    patternValues.reduce((sum, v) => sum + v, 0) / patternValues.length;
  const coefficient =
    overallAverage > 0 ? patternAverage / overallAverage : 1;

  return {
    coefficient: Math.max(0.1, Math.min(3, coefficient)),
    patternAverage,
    overallAverage,
  };
}
