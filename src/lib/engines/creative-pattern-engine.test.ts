import { describe, expect, it } from "vitest";
import {
  blocksEqual,
  detectPresetFromBlocks,
  estimatePatternCoefficient,
  getPresetBlocks,
  parseTimeToMinutes,
  resolvePatternCoefficient,
} from "./creative-pattern-engine";

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
