import { describe, expect, it } from "vitest";
import { computePatternCoefficientFromDayparts } from "./dayparts-engine";
import type { DaypartsData } from "@/types/dayparts";
import type { PatternBlock } from "@/types/master";

function buildDayparts(
  ratings: Record<string, Partial<Record<string, number>>>,
): DaypartsData {
  return {
    id: "test",
    area: "宮城",
    periodStart: "2026-01-01",
    periodEnd: "2026-03-31",
    sampleSize: 200,
    timeSlotUnit: 60,
    ratingType: "世帯",
    importedAt: new Date().toISOString(),
    fileName: "test.xlsx",
    sheets: [
      {
        target: "個人全体",
        blocks: [
          {
            station: "TBC",
            stationNormalized: "TBC",
            ratings,
          },
        ],
      },
    ],
    unmappedStations: [],
  };
}

const morningBlock: PatternBlock[] = [
  {
    weekday_group: "ALL",
    time_slots: [{ start: "07:00", end: "08:00" }],
  },
];

describe("dayparts-engine", () => {
  it("computes coefficient as pattern average / overall average", () => {
    const data = buildDayparts({
      "07:00": { 月: 8, 火: 8, 水: 8, 木: 8, 金: 8, 土: 8, 日: 8 },
      "14:00": { 月: 2, 火: 2, 水: 2, 木: 2, 金: 2, 土: 2, 日: 2 },
    });
    const result = computePatternCoefficientFromDayparts(
      data,
      "個人全体",
      ["TBC"],
      morningBlock,
    );
    expect(result).not.toBeNull();
    // 全体平均 = (8+2)/2 = 5、絵柄平均 = 8 → 係数 1.6
    expect(result!.overallAverage).toBeCloseTo(5, 5);
    expect(result!.patternAverage).toBeCloseTo(8, 5);
    expect(result!.coefficient).toBeCloseTo(1.6, 5);
  });

  it("clips extreme coefficients into the allowed range", () => {
    const data = buildDayparts({
      "07:00": { 月: 100, 火: 100, 水: 100, 木: 100, 金: 100, 土: 100, 日: 100 },
      "14:00": { 月: 0.1, 火: 0.1, 水: 0.1, 木: 0.1, 金: 0.1, 土: 0.1, 日: 0.1 },
    });
    const result = computePatternCoefficientFromDayparts(
      data,
      "個人全体",
      ["TBC"],
      morningBlock,
    );
    expect(result).not.toBeNull();
    expect(result!.coefficient).toBeLessThanOrEqual(3);
    expect(result!.coefficient).toBeGreaterThanOrEqual(0.1);
  });

  it("returns null when no stations are selected", () => {
    const data = buildDayparts({
      "07:00": { 月: 5 },
    });
    expect(
      computePatternCoefficientFromDayparts(data, "個人全体", [], morningBlock),
    ).toBeNull();
  });

  it("returns null when target sheet has no matching station data", () => {
    const data = buildDayparts({
      "07:00": { 月: 5 },
    });
    expect(
      computePatternCoefficientFromDayparts(
        data,
        "個人全体",
        ["UNKNOWN_STATION"],
        morningBlock,
      ),
    ).toBeNull();
  });
});
