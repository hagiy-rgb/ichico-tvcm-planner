import { describe, expect, it } from "vitest";
import { computePatternCoefficientFromDayparts } from "@/lib/engines/dayparts-engine";
import { parseDaypartsMatrix } from "@/lib/io/dayparts-import";
import type { DaypartsData } from "@/types/dayparts";
import { getPresetBlocks } from "@/lib/engines/creative-pattern-engine";

function buildSampleMatrix(): unknown[][] {
  const header = ["", "月", "火", "水", "木", "金", "土", "日", "平日平均", "週平均"];
  return [
    ["地区", "仙台"],
    ["期間", "2025/06/01 - 2025/09/30"],
    ["", ""],
    ["TBC", "", "", "", "", "", "", "", "", ""],
    header,
    ["05:00", 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    ["06:00", 2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0],
    ["19:00", 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
    ["", ""],
    ["ミヤギテレビ", "", "", "", "", "", "", "", "", ""],
    header,
    ["05:00", 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8],
    ["06:00", 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5],
    ["19:00", 4.0, 4.0, 4.0, 4.0, 4.0, 4.0, 4.0, 4.0, 4.0],
  ];
}

describe("dayparts import", () => {
  it("parses PM Plus style matrix blocks", () => {
    const sheet = parseDaypartsMatrix(buildSampleMatrix(), "世帯", {
      areaHint: "宮城",
    });
    expect(sheet.blocks.length).toBe(2);
    expect(sheet.blocks[0].stationNormalized).toBe("TBC");
    expect(sheet.blocks[0].ratings["06:00"]?.月).toBe(2.0);
  });

  it("computes pattern coefficient above baseline for prime-heavy pattern", () => {
    const sheet = parseDaypartsMatrix(buildSampleMatrix(), "世帯", {
      areaHint: "宮城",
    });
    const data: DaypartsData = {
      id: "test",
      area: "宮城",
      periodStart: "",
      periodEnd: "",
      sampleSize: 0,
      timeSlotUnit: 60,
      ratingType: "世帯",
      importedAt: new Date().toISOString(),
      fileName: "test.xlsx",
      sheets: [sheet],
      unmappedStations: [],
    };

    const inverseL = getPresetBlocks("逆L");
    const allDay = getPresetBlocks("全日");

    const primeCoef = computePatternCoefficientFromDayparts(
      data,
      "世帯",
      ["TBC", "MMT"],
      inverseL,
    );
    const allDayCoef = computePatternCoefficientFromDayparts(
      data,
      "世帯",
      ["TBC", "MMT"],
      allDay,
    );

    expect(primeCoef).not.toBeNull();
    expect(allDayCoef).not.toBeNull();
    expect(primeCoef!.coefficient).toBeGreaterThan(allDayCoef!.coefficient);
  });
});
