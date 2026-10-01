"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  applyBrushLine,
  applyRectangle,
  blocksToCellSet,
  cellSetsEqual,
  cellsToBlocks,
  countActiveHours,
  describeMatrixRect,
  indexAtPosition,
  isHourActive,
  isInRect,
  MATRIX_HOURS,
  MATRIX_TIME_AXIS_LABEL,
  MATRIX_WEEKDAYS,
  matrixHourEndLabel,
  rectBounds,
  setHourCells,
  type MatrixCellRef,
} from "@/lib/engines/pattern-matrix";
import type { PatternBlock } from "@/types/master";

type Props = {
  blocks: PatternBlock[];
  onChange: (blocks: PatternBlock[]) => void;
};

type DragMode = "rect" | "brush";

type DragState = {
  pointerId: number;
  mode: DragMode;
  /** 開始セルの状態を反転した値。矩形／軌跡の全枠をこの値に揃える */
  value: boolean;
  anchor: MatrixCellRef;
  current: MatrixCellRef;
  /** ドラッグ開始時点の確定セル */
  base: Set<string>;
  /** プレビュー用の未確定セル（確定は pointerup で1回だけ onChange） */
  draft: Set<string>;
};

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function sameCell(a: MatrixCellRef, b: MatrixCellRef): boolean {
  return a.dayIndex === b.dayIndex && a.hourIndex === b.hourIndex;
}

export function PatternMatrixGrid({ blocks, onChange }: Props) {
  const cells = useMemo(() => blocksToCellSet(blocks), [blocks]);
  const rootRef = useRef<HTMLDivElement>(null);
  const dayHeaderRefs = useRef<(HTMLTableCellElement | null)[]>([]);
  const hourLabelRefs = useRef<(HTMLTableCellElement | null)[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const updateDrag = useCallback((next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  /** 列＝曜日ヘッダ、行＝時刻ラベルの実寸から判定（グリッド外は端へクランプ） */
  const hitTest = useCallback(
    (clientX: number, clientY: number): MatrixCellRef | null => {
      const columns = dayHeaderRefs.current;
      const rows = hourLabelRefs.current;
      if (
        columns.length !== MATRIX_WEEKDAYS.length ||
        rows.length !== MATRIX_HOURS.length ||
        columns.some((el) => !el) ||
        rows.some((el) => !el)
      ) {
        return null;
      }
      return {
        dayIndex: indexAtPosition(
          columns.map((el) => el!.getBoundingClientRect().right),
          clientX,
        ),
        hourIndex: indexAtPosition(
          rows.map((el) => el!.getBoundingClientRect().bottom),
          clientY,
        ),
      };
    },
    [],
  );

  const commitDrag = useCallback(() => {
    const state = dragRef.current;
    if (!state) return;
    updateDrag(null);
    if (!cellSetsEqual(state.draft, state.base)) {
      onChange(cellsToBlocks(state.draft));
    }
  }, [onChange, updateDrag]);

  const cancelDrag = useCallback(() => {
    const state = dragRef.current;
    if (!state) return;
    updateDrag(null);
    const root = rootRef.current;
    if (root?.hasPointerCapture(state.pointerId)) {
      root.releasePointerCapture(state.pointerId);
    }
  }, [updateDrag]);

  const isDragging = drag !== null;
  useEffect(() => {
    if (!isDragging) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      cancelDrag();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDragging, cancelDrag]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || dragRef.current) return;
    const cellElement = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-matrix-day-index]",
    );
    if (!cellElement) return;
    const dayIndex = Number(cellElement.dataset.matrixDayIndex);
    const hourIndex = Number(cellElement.dataset.matrixHourIndex);
    if (!Number.isInteger(dayIndex) || !Number.isInteger(hourIndex)) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const cell = { dayIndex, hourIndex };
    const value = !isHourActive(
      cells,
      MATRIX_WEEKDAYS[dayIndex],
      MATRIX_HOURS[hourIndex],
    );
    const mode: DragMode = event.shiftKey ? "brush" : "rect";
    const base = new Set(cells);
    updateDrag({
      pointerId: event.pointerId,
      mode,
      value,
      anchor: cell,
      current: cell,
      base,
      draft:
        mode === "rect"
          ? applyRectangle(base, rectBounds(cell, cell), value)
          : applyBrushLine(base, cell, cell, value),
    });
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const cell = hitTest(event.clientX, event.clientY);
    if (!cell || sameCell(cell, state.current)) return;
    updateDrag({
      ...state,
      current: cell,
      draft:
        state.mode === "rect"
          ? applyRectangle(state.base, rectBounds(state.anchor, cell), state.value)
          : applyBrushLine(state.draft, state.current, cell, state.value),
    });
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    commitDrag();
  };

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    cancelDrag();
  };

  /** キーボード（Enter/Space）操作のみ。ポインタ操作は pointerup で確定済み */
  const toggleSingleFromKeyboard = (dayIndex: number, hourIndex: number) => {
    const day = MATRIX_WEEKDAYS[dayIndex];
    const hour = MATRIX_HOURS[hourIndex];
    const next = new Set(cells);
    setHourCells(next, day, hour, !isHourActive(cells, day, hour));
    onChange(cellsToBlocks(next));
  };

  const displayCells = drag?.draft ?? cells;
  const rect =
    drag?.mode === "rect" ? rectBounds(drag.anchor, drag.current) : null;
  const activeCount = countActiveHours(displayCells);

  let status: string;
  if (drag && rect) {
    status = `${describeMatrixRect(rect)} を${drag.value ? "ON" : "OFF"}（離すと確定／Escで取消）`;
  } else if (drag) {
    status = `なぞった枠を${drag.value ? "ON" : "OFF"}（離すと確定／Escで取消）`;
  } else {
    status = `ON ${activeCount} 枠（1枠＝1時間）`;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        時間帯 {MATRIX_TIME_AXIS_LABEL}。クリックで1枠を切替、ドラッグで曜日×時間の矩形を一括設定（開始セルと反対の状態）、Shift+ドラッグでなぞった枠だけを塗ります。
      </p>
      <div
        ref={rootRef}
        className="overflow-x-auto rounded-lg border border-slate-200 select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onLostPointerCapture={handlePointerEnd}
        onPointerCancel={handlePointerCancel}
      >
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-left font-medium text-slate-600">
                時間
              </th>
              {MATRIX_WEEKDAYS.map((day, dayIndex) => (
                <th
                  key={day}
                  ref={(el) => {
                    dayHeaderRefs.current[dayIndex] = el;
                  }}
                  className="border-b border-slate-200 px-1 py-2 text-center font-medium text-slate-600"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX_HOURS.map((hour, hourIndex) => (
              <tr key={hour}>
                <td
                  ref={(el) => {
                    hourLabelRefs.current[hourIndex] = el;
                  }}
                  title={`${hourLabel(hour)}–${matrixHourEndLabel(hour)}`}
                  className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50 px-2 py-0.5 font-medium text-slate-700"
                >
                  {hourLabel(hour)}
                </td>
                {MATRIX_WEEKDAYS.map((day, dayIndex) => {
                  const active = isHourActive(displayCells, day, hour);
                  const wasActive = drag
                    ? isHourActive(drag.base, day, hour)
                    : active;
                  const inRect = rect
                    ? isInRect(rect, dayIndex, hourIndex)
                    : false;
                  let fill: string;
                  if (active && !wasActive) {
                    fill = "bg-sky-400";
                  } else if (!active && wasActive) {
                    fill = "bg-rose-200";
                  } else if (active) {
                    fill = "bg-sky-500 shadow-inner";
                  } else {
                    fill = drag
                      ? "bg-slate-100"
                      : "bg-slate-100 hover:bg-slate-200";
                  }
                  const outline = inRect
                    ? drag?.value
                      ? " ring-2 ring-inset ring-sky-700"
                      : " ring-2 ring-inset ring-rose-500"
                    : "";
                  return (
                    <td
                      key={`${day}-${hour}`}
                      data-matrix-day-index={dayIndex}
                      data-matrix-hour-index={hourIndex}
                      className="p-[2px]"
                      style={{ touchAction: "none" }}
                    >
                      <button
                        type="button"
                        className={`block h-7 w-full rounded-sm transition-colors ${fill}${outline}`}
                        aria-pressed={active}
                        aria-label={`${day} ${hourLabel(hour)}–${matrixHourEndLabel(hour)}`}
                        onClick={(e) => {
                          if (e.detail === 0) {
                            toggleSingleFromKeyboard(dayIndex, hourIndex);
                          }
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p
        className={`text-xs ${
          !drag && activeCount === 0 ? "text-amber-700" : "text-slate-600"
        }`}
        aria-live="polite"
      >
        {!drag && activeCount === 0
          ? "枠が未選択です。全日平均（k補正 1.000・全日単価）として計算しています。"
          : status}
      </p>
    </div>
  );
}
