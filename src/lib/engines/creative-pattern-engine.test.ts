import { describe, expect, it } from "vitest";
import {
  blocksEqual,
  detectPresetFromBlocks,
  estimatePatternCoefficient,
  expandBlocksToCellKeys,
  getPresetBlocks,
  parseTimeToMinutes,
  resolvePatternCoefficient,
} from "./creative-pattern-engine";
import { isHourActive } from "./pattern-matrix";

describe("creative-pattern-engine", () => {
  it("parses broadcast time including 29:00", () => {
    expect(parseTimeToMinutes("07:00")).toBe(7 * 60);
    expect(parseTimeToMinutes("29:00")).toBe(29 * 60);
  });

  it("detects ヨの字 preset blocks", () => {
    const blocks = getPresetBlocks("ヨの字");
    expect(detectPresetFromBlocks(blocks)).toBe("ヨの字");
    expect(resolvePatternCoefficient("ヨの字", blocks)).toBe(1.05);
  });

  it("ヨの字 includes 6/7/13/17/23/24 hour bands on weekdays and weekends", () => {
    const cells = expandBlocksToCellKeys(getPresetBlocks("ヨの字"));
    for (const day of ["月", "土"]) {
      for (const hour of [6, 7, 13, 23, 24]) {
        expect(isHourActive(cells, day, hour)).toBe(true);
      }
    }
    for (const day of ["土", "日"]) {
      expect(isHourActive(cells, day, 17)).toBe(true);
    }
  });

  it("コの字: all days include 6時台; weekday excludes 17時台; weekend includes 9-10", () => {
    const cells = expandBlocksToCellKeys(getPresetBlocks("コの字"));
    for (const day of ["月", "土"]) {
      expect(isHourActive(cells, day, 6)).toBe(true);
    }
    expect(isHourActive(cells, "月", 17)).toBe(false);
    expect(isHourActive(cells, "月", 18)).toBe(true);
    for (const day of ["土", "日"]) {
      for (const hour of [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 23, 24]) {
        expect(isHourActive(cells, day, hour)).toBe(true);
      }
    }
  });

  it("逆L covers 24:00 hour and weekend daytime from 6:00", () => {
    const cells = expandBlocksToCellKeys(getPresetBlocks("逆L"));
    for (const day of ["月", "土"]) {
      expect(isHourActive(cells, day, 24)).toBe(true);
    }
    for (const day of ["土", "日"]) {
      expect(isHourActive(cells, day, 6)).toBe(true);
      expect(isHourActive(cells, day, 11)).toBe(true);
      expect(isHourActive(cells, day, 17)).toBe(true);
    }
  });

  it("全日 excludes 5:00 and 25:00+ hours", () => {
    const cells = expandBlocksToCellKeys(getPresetBlocks("全日"));
    expect(isHourActive(cells, "月", 5)).toBe(false);
    expect(isHourActive(cells, "月", 6)).toBe(true);
    expect(isHourActive(cells, "月", 24)).toBe(true);
    expect(isHourActive(cells, "月", 25)).toBe(false);
  });

  it("resolves coefficient for 逆L preset", () => {
    const blocks = getPresetBlocks("逆L");
    expect(resolvePatternCoefficient("逆L", blocks)).toBe(1.2);
  });

  it("compares blocks for equality", () => {
    const a = getPresetBlocks("全日");
    const b = getPresetBlocks("全日");
    expect(blocksEqual(a, b)).toBe(true);
    expect(blocksEqual(a, getPresetBlocks("ヨの字"))).toBe(false);
  });
});
