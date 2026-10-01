import {
  expandBlocksToCellKeys,
  parseTimeToMinutes,
} from "@/lib/engines/creative-pattern-engine";
import type { PatternBlock } from "@/types/master";

export const MATRIX_WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"] as const;
export const MATRIX_HOURS = Array.from({ length: 24 }, (_, i) => i + 5);
/** 放送日（5:00起点）の時間軸。最終行 28:00 は 28:00–29:00（翌5:00）まで */
export const MATRIX_TIME_AXIS_LABEL = "05:00–28:00（〜翌5:00=29:00）";

/** マトリクス上のセル位置（MATRIX_WEEKDAYS / MATRIX_HOURS のインデックス） */
export type MatrixCellRef = { dayIndex: number; hourIndex: number };

/** 曜日×時の矩形（両端を含むインデックス範囲） */
export type MatrixRect = {
  dayStart: number;
  dayEnd: number;
  hourStart: number;
  hourEnd: number;
};

export function hourToMinute(hour: number): number {
  return parseTimeToMinutes(`${String(hour).padStart(2, "0")}:00`);
}

export function minuteToHourLabel(minute: number): string {
  const h = Math.floor(minute / 60);
  return `${String(h).padStart(2, "0")}:00`;
}

export function cellKey(day: string, hour: number): string {
  return `${day}:${hourToMinute(hour)}`;
}

/** マトリクス1行（時）に含まれる30分スロットの分キー */
export function hourSlotMinuteKeys(day: string, hour: number): string[] {
  const start = hourToMinute(hour);
  const end =
    hour >= 28 ? parseTimeToMinutes("29:00") : hourToMinute(hour + 1);
  const keys: string[] = [];
  for (let minute = start; minute < end; minute += 30) {
    keys.push(`${day}:${minute}`);
  }
  return keys;
}

export function isHourActive(
  cells: ReadonlySet<string>,
  day: string,
  hour: number,
): boolean {
  return hourSlotMinuteKeys(day, hour).some((key) => cells.has(key));
}

export function setHourCells(
  cells: Set<string>,
  day: string,
  hour: number,
  active: boolean,
): void {
  for (const key of hourSlotMinuteKeys(day, hour)) {
    if (active) cells.add(key);
    else cells.delete(key);
  }
}

export function blocksToCellSet(blocks: PatternBlock[]): Set<string> {
  return expandBlocksToCellKeys(blocks);
}

export function cellSetsEqual(
  a: ReadonlySet<string>,
  b: ReadonlySet<string>,
): boolean {
  if (a.size !== b.size) return false;
  for (const key of a) {
    if (!b.has(key)) return false;
  }
  return true;
}

/** ON の時間枠（曜日×1時間）の数 */
export function countActiveHours(cells: ReadonlySet<string>): number {
  let count = 0;
  for (const day of MATRIX_WEEKDAYS) {
    for (const hour of MATRIX_HOURS) {
      if (isHourActive(cells, day, hour)) count += 1;
    }
  }
  return count;
}

export function rectBounds(a: MatrixCellRef, b: MatrixCellRef): MatrixRect {
  return {
    dayStart: Math.min(a.dayIndex, b.dayIndex),
    dayEnd: Math.max(a.dayIndex, b.dayIndex),
    hourStart: Math.min(a.hourIndex, b.hourIndex),
    hourEnd: Math.max(a.hourIndex, b.hourIndex),
  };
}

export function isInRect(
  rect: MatrixRect,
  dayIndex: number,
  hourIndex: number,
): boolean {
  return (
    dayIndex >= rect.dayStart &&
    dayIndex <= rect.dayEnd &&
    hourIndex >= rect.hourStart &&
    hourIndex <= rect.hourEnd
  );
}

/** 矩形内の全時間枠を active に揃えた新しい集合（入力は変更しない） */
export function applyRectangle(
  cells: ReadonlySet<string>,
  rect: MatrixRect,
  active: boolean,
): Set<string> {
  const next = new Set(cells);
  for (let d = rect.dayStart; d <= rect.dayEnd; d += 1) {
    for (let h = rect.hourStart; h <= rect.hourEnd; h += 1) {
      setHourCells(next, MATRIX_WEEKDAYS[d], MATRIX_HOURS[h], active);
    }
  }
  return next;
}

/**
 * from→to の軌跡上のセル。各ステップで縦横とも高々1しか動かないため、
 * ポインタイベントが間引かれても途中のセルが抜けない。
 */
export function cellsOnLine(
  from: MatrixCellRef,
  to: MatrixCellRef,
): MatrixCellRef[] {
  const dDay = to.dayIndex - from.dayIndex;
  const dHour = to.hourIndex - from.hourIndex;
  const steps = Math.max(Math.abs(dDay), Math.abs(dHour));
  if (steps === 0) return [{ ...from }];
  const cells: MatrixCellRef[] = [];
  for (let i = 0; i <= steps; i += 1) {
    cells.push({
      dayIndex: Math.round(from.dayIndex + (dDay * i) / steps),
      hourIndex: Math.round(from.hourIndex + (dHour * i) / steps),
    });
  }
  return cells;
}

/** ブラシ塗り: from→to の軌跡上の時間枠を active にした新しい集合 */
export function applyBrushLine(
  cells: ReadonlySet<string>,
  from: MatrixCellRef,
  to: MatrixCellRef,
  active: boolean,
): Set<string> {
  const next = new Set(cells);
  for (const cell of cellsOnLine(from, to)) {
    setHourCells(
      next,
      MATRIX_WEEKDAYS[cell.dayIndex],
      MATRIX_HOURS[cell.hourIndex],
      active,
    );
  }
  return next;
}

/**
 * 昇順に並んだ区間終端座標から、position が属する区間のインデックスを返す。
 * 範囲外は先頭／末尾にクランプする（グリッド外へドラッグしても端の行・列を選べる）。
 */
export function indexAtPosition(
  ends: readonly number[],
  position: number,
): number {
  for (let i = 0; i < ends.length; i += 1) {
    if (position < ends[i]) return i;
  }
  return Math.max(0, ends.length - 1);
}

/** 行（時）の終端ラベル。28 の行は 29:00（翌5:00）まで */
export function matrixHourEndLabel(hour: number): string {
  return `${String(hour + 1).padStart(2, "0")}:00`;
}

export function describeMatrixRect(rect: MatrixRect): string {
  const dayStart = MATRIX_WEEKDAYS[rect.dayStart];
  const dayEnd = MATRIX_WEEKDAYS[rect.dayEnd];
  const days = dayStart === dayEnd ? dayStart : `${dayStart}〜${dayEnd}`;
  const start = `${String(MATRIX_HOURS[rect.hourStart]).padStart(2, "0")}:00`;
  const end = matrixHourEndLabel(MATRIX_HOURS[rect.hourEnd]);
  return `${days} ${start}–${end}`;
}

export function cellsToBlocks(cells: ReadonlySet<string>): PatternBlock[] {
  const blocks: PatternBlock[] = [];

  for (const day of MATRIX_WEEKDAYS) {
    const activeHours = MATRIX_HOURS.filter((h) => isHourActive(cells, day, h));
    if (activeHours.length === 0) continue;

    let rangeStart = activeHours[0];
    let prev = activeHours[0];

    const flush = (start: number, endHour: number) => {
      const endMinute =
        endHour >= 28
          ? parseTimeToMinutes("29:00")
          : hourToMinute(endHour + 1);
      blocks.push({
        weekday_group: day,
        time_slots: [
          {
            start: minuteToHourLabel(hourToMinute(start)),
            end: minuteToHourLabel(endMinute),
          },
        ],
      });
    };

    for (let i = 1; i < activeHours.length; i++) {
      const h = activeHours[i];
      if (h === prev + 1) {
        prev = h;
        continue;
      }
      flush(rangeStart, prev);
      rangeStart = h;
      prev = h;
    }
    flush(rangeStart, prev);
  }

  return blocks;
}
