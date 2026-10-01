import { describe, expect, it } from "vitest";
import {
  detectPresetNameFromBlocks,
  getPresetBlocks,
} from "@/lib/engines/creative-pattern-engine";
import {
  decodePatternBlocks,
  encodePatternBlocks,
} from "@/lib/io/pattern-blocks-codec";
import {
  createDefaultInput,
  normalizeSimulationInput,
} from "@/lib/stores/simulation-store";
import {
  applyBrushLine,
  applyRectangle,
  blocksToCellSet,
  cellSetsEqual,
  cellsOnLine,
  cellsToBlocks,
  countActiveHours,
  describeMatrixRect,
  indexAtPosition,
  isHourActive,
  MATRIX_HOURS,
  MATRIX_WEEKDAYS,
  rectBounds,
  setHourCells,
} from "./pattern-matrix";

const PRESETS = ["全日", "ヨの字", "コの字", "逆L", "一の字"] as const;

/** 再現性のある乱数（mulberry32） */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomHourCells(random: () => number, density: number): Set<string> {
  const cells = new Set<string>();
  for (const day of MATRIX_WEEKDAYS) {
    for (const hour of MATRIX_HOURS) {
      if (random() < density) setHourCells(cells, day, hour, true);
    }
  }
  return cells;
}

describe("pattern-matrix round-trip", () => {
  it.each(PRESETS)("preserves %s cells through cellsToBlocks", (name) => {
    const cells = blocksToCellSet(getPresetBlocks(name));
    const blocks = cellsToBlocks(cells);

    expect(cellSetsEqual(blocksToCellSet(blocks), cells)).toBe(true);
    // 曜日別ブロックに展開されても、セルが一致すればプリセットとして認識される
    expect(detectPresetNameFromBlocks(blocks)).toBe(name);
  });

  it("preserves random hour sets", () => {
    const random = seededRandom(20261001);
    for (let trial = 0; trial < 50; trial += 1) {
      const cells = randomHourCells(random, 0.1 + 0.8 * random());
      const restored = blocksToCellSet(cellsToBlocks(cells));
      expect(cellSetsEqual(restored, cells)).toBe(true);
    }
  });

  it("maps the 28 row to 28:00–29:00 (翌5:00)", () => {
    const cells = new Set<string>();
    setHourCells(cells, "月", 28, true);

    expect(cellsToBlocks(cells)).toEqual([
      { weekday_group: "月", time_slots: [{ start: "28:00", end: "29:00" }] },
    ]);
    expect([...blocksToCellSet(cellsToBlocks(cells))].sort()).toEqual([
      "月:1680",
      "月:1710",
    ]);
  });

  it("treats one extra cell as カスタム", () => {
    const cells = blocksToCellSet(getPresetBlocks("ヨの字"));
    setHourCells(cells, "日", 28, !isHourActive(cells, "日", 28));
    expect(detectPresetNameFromBlocks(cellsToBlocks(cells))).toBe("カスタム");
  });
});

describe("pattern-matrix rectangle selection", () => {
  it("selects a weekday span including the 05 and 28 rows", () => {
    const rect = rectBounds(
      { dayIndex: 3, hourIndex: MATRIX_HOURS.length - 1 },
      { dayIndex: 1, hourIndex: 0 },
    );
    const cells = applyRectangle(new Set(), rect, true);

    expect(countActiveHours(cells)).toBe(3 * 24);
    expect(cellsToBlocks(cells)).toEqual(
      ["火", "水", "木"].map((day) => ({
        weekday_group: day,
        time_slots: [{ start: "05:00", end: "29:00" }],
      })),
    );
    expect(describeMatrixRect(rect)).toBe("火〜木 05:00–29:00");
  });

  it("clears a rectangle and splits the day into two blocks", () => {
    const full = applyRectangle(
      new Set(),
      rectBounds({ dayIndex: 2, hourIndex: 0 }, { dayIndex: 2, hourIndex: 23 }),
      true,
    );
    // hourIndex 10..12 = 15:00–18:00
    const cleared = applyRectangle(
      full,
      rectBounds({ dayIndex: 2, hourIndex: 12 }, { dayIndex: 2, hourIndex: 10 }),
      false,
    );

    expect(cellsToBlocks(cleared)).toEqual([
      { weekday_group: "水", time_slots: [{ start: "05:00", end: "15:00" }] },
      { weekday_group: "水", time_slots: [{ start: "18:00", end: "29:00" }] },
    ]);
    // 元の集合は変更しない（ドラッグ中の base を保つため）
    expect(countActiveHours(full)).toBe(24);
  });

  it("covers the whole grid from corner to corner", () => {
    const cells = applyRectangle(
      new Set(),
      rectBounds({ dayIndex: 6, hourIndex: 23 }, { dayIndex: 0, hourIndex: 0 }),
      true,
    );
    expect(countActiveHours(cells)).toBe(7 * 24);
  });
});

describe("pattern-matrix brush and hit testing", () => {
  it("walks a gap-free path between distant cells", () => {
    const from = { dayIndex: 0, hourIndex: 0 };
    const to = { dayIndex: 6, hourIndex: 23 };
    const path = cellsOnLine(from, to);

    expect(path[0]).toEqual(from);
    expect(path[path.length - 1]).toEqual(to);
    for (let i = 1; i < path.length; i += 1) {
      expect(Math.abs(path[i].dayIndex - path[i - 1].dayIndex)).toBeLessThanOrEqual(1);
      expect(Math.abs(path[i].hourIndex - path[i - 1].hourIndex)).toBeLessThanOrEqual(1);
    }
  });

  it("paints every hour along a fast vertical stroke", () => {
    const cells = applyBrushLine(
      new Set(),
      { dayIndex: 6, hourIndex: 0 },
      { dayIndex: 6, hourIndex: 23 },
      true,
    );
    expect(cellsToBlocks(cells)).toEqual([
      { weekday_group: "日", time_slots: [{ start: "05:00", end: "29:00" }] },
    ]);
  });

  it("clamps positions outside the grid to the edge rows/columns", () => {
    const ends = [100, 140, 180];
    expect(indexAtPosition(ends, -50)).toBe(0);
    expect(indexAtPosition(ends, 99.5)).toBe(0);
    expect(indexAtPosition(ends, 100)).toBe(1);
    expect(indexAtPosition(ends, 179)).toBe(2);
    expect(indexAtPosition(ends, 5000)).toBe(2);
  });
});

describe("pattern blocks CSV codec", () => {
  it.each(PRESETS)("round-trips %s blocks", (name) => {
    const blocks = getPresetBlocks(name);
    expect(decodePatternBlocks(encodePatternBlocks(blocks))).toEqual(blocks);
  });

  it("treats an empty value as no cells and rejects malformed values", () => {
    expect(decodePatternBlocks("")).toEqual([]);
    expect(decodePatternBlocks("月07:00-09:00")).toBeNull();
    expect(decodePatternBlocks("月@7:00-09:00")).toBeNull();
    expect(decodePatternBlocks("月@07:00-09:00-10:00")).toBeNull();
  });
});

describe("normalizeSimulationInput with custom patterns", () => {
  it("keeps an intentionally empty custom pattern instead of reviving ヨの字", () => {
    const normalized = normalizeSimulationInput({
      ...createDefaultInput(),
      creativePattern: { presetName: "カスタム", blocks: [] },
    });
    expect(normalized.creativePattern.blocks).toEqual([]);
  });
});
