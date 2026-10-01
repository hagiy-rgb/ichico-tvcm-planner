import { describe, expect, it } from "vitest";
import {
  buildPresetGrpSchedule,
  clampCampaignPeriods,
  convertPeriodCount,
  describeCampaignPeriod,
  grpScheduleSum,
  isGrpScheduleValid,
  MAX_CAMPAIGN_PERIODS,
  normalizeGrpDistribution,
  normalizePlanningGranularity,
  periodLabel,
  periodsToWeeks,
  resampleSchedule,
  rescaleSchedule,
  resolvePeriodGrpSchedule,
  summarizePeriodAllocation,
} from "./grp-schedule";

describe("grp-schedule", () => {
  it("normalizes legacy and unknown values", () => {
    expect(normalizeGrpDistribution("even")).toBe("even");
    expect(normalizeGrpDistribution("front_heavy")).toBe("front_heavy");
    expect(normalizeGrpDistribution("back_heavy")).toBe("back_heavy");
    expect(normalizeGrpDistribution("lump_sum")).toBe("front_heavy");
    expect(normalizeGrpDistribution("even_weekly")).toBe("even");
    expect(normalizeGrpDistribution(undefined)).toBe("even");
    expect(normalizePlanningGranularity("month")).toBe("month");
    expect(normalizePlanningGranularity("quarter")).toBe("week");
    expect(normalizePlanningGranularity(undefined)).toBe("week");
  });

  it("builds schedules that sum to totalGrp for each preset", () => {
    for (const preset of ["even", "front_heavy", "back_heavy"] as const) {
      for (const periods of [1, 2, 3, 4, 7]) {
        const schedule = buildPresetGrpSchedule(300, periods, preset);
        expect(schedule).toHaveLength(periods);
        expect(grpScheduleSum(schedule)).toBeCloseTo(300, 6);
      }
    }
  });

  it("weights the front half heavier for front_heavy", () => {
    const schedule = buildPresetGrpSchedule(400, 4, "front_heavy");
    const firstHalf = schedule[0] + schedule[1];
    const secondHalf = schedule[2] + schedule[3];
    expect(firstHalf).toBeGreaterThan(secondHalf);
  });

  it("weights the back half heavier for back_heavy", () => {
    const schedule = buildPresetGrpSchedule(400, 4, "back_heavy");
    const firstHalf = schedule[0] + schedule[1];
    const secondHalf = schedule[2] + schedule[3];
    expect(secondHalf).toBeGreaterThan(firstHalf);
  });

  it("keeps even distribution even and 6:4 halves for odd period counts", () => {
    expect(buildPresetGrpSchedule(300, 3, "even")).toEqual([100, 100, 100]);

    const front = buildPresetGrpSchedule(300, 3, "front_heavy");
    expect(front[0]).toBeCloseTo(120, 9);
    expect(front[1]).toBeCloseTo(100, 9);
    expect(front[2]).toBeCloseTo(80, 9);

    const back = buildPresetGrpSchedule(500, 5, "back_heavy");
    [80, 80, 100, 120, 120].forEach((expected, index) => {
      expect(back[index]).toBeCloseTo(expected, 9);
    });
  });

  it("defines presets on the campaign timeline, so weekly and monthly shapes agree", () => {
    const weekly = buildPresetGrpSchedule(1200, 8, "front_heavy");
    const monthly = buildPresetGrpSchedule(1200, 2, "front_heavy");
    const resampled = resampleSchedule(weekly, 2);
    expect(resampled[0]).toBeCloseTo(monthly[0], 9);
    expect(resampled[1]).toBeCloseTo(monthly[1], 9);
    expect(monthly[0]).toBeCloseTo(720, 9);
  });

  it("validates schedule sums with tolerance", () => {
    expect(isGrpScheduleValid([100, 100, 100], 300)).toBe(true);
    expect(isGrpScheduleValid([100, 100], 300)).toBe(false);
  });
});

describe("grp-schedule periods", () => {
  it("clamps period counts per granularity", () => {
    expect(clampCampaignPeriods(0, "week")).toBe(1);
    expect(clampCampaignPeriods(2.6, "month")).toBe(3);
    expect(clampCampaignPeriods(99, "week")).toBe(MAX_CAMPAIGN_PERIODS.week);
    expect(clampCampaignPeriods(99, "month")).toBe(MAX_CAMPAIGN_PERIODS.month);
    expect(clampCampaignPeriods(Number.NaN, "month")).toBe(1);
  });

  it("converts period counts between weeks and months at 4.345 weeks/month", () => {
    expect(convertPeriodCount(4, "week", "month")).toBe(1);
    expect(convertPeriodCount(13, "week", "month")).toBe(3);
    expect(convertPeriodCount(3, "month", "week")).toBe(13);
    expect(convertPeriodCount(1, "week", "month")).toBe(1);
    expect(convertPeriodCount(6, "month", "month")).toBe(6);
    expect(periodsToWeeks(3, "month")).toBe(13);
    expect(periodsToWeeks(5, "week")).toBe(5);
  });

  it("labels periods and describes campaign length for legacy inputs", () => {
    expect(periodLabel(0, "week")).toBe("第1週");
    expect(periodLabel(2, "month")).toBe("第3月");
    expect(describeCampaignPeriod({ campaignWeeks: 4 })).toBe("4週");
    expect(
      describeCampaignPeriod({
        planningGranularity: "month",
        campaignPeriods: 3,
        campaignWeeks: 13,
      }),
    ).toBe("3か月");
  });

  it("rescales a schedule to the total while keeping its shape", () => {
    expect(rescaleSchedule([1, 2, 1], 400)).toEqual([100, 200, 100]);
    expect(rescaleSchedule([0, 0], 100)).toEqual([50, 50]);
    expect(rescaleSchedule([-5, Number.NaN, 10], 20)).toEqual([0, 0, 20]);
    expect(rescaleSchedule([], 100)).toEqual([]);
  });

  it("resamples with area preservation (total and front/back shape kept)", () => {
    const weekly = [300, 300, 100, 100];
    const halved = resampleSchedule(weekly, 2);
    expect(halved).toEqual([600, 200]);

    const stretched = resampleSchedule([600, 200], 4);
    expect(grpScheduleSum(stretched)).toBeCloseTo(800, 9);
    expect(stretched).toEqual([300, 300, 100, 100]);

    for (const length of [1, 3, 5, 13]) {
      const resampled = resampleSchedule([120, 80, 40, 0, 60], length);
      expect(resampled).toHaveLength(length);
      expect(grpScheduleSum(resampled)).toBeCloseTo(300, 9);
    }

    const front = resampleSchedule([400, 300, 200, 100], 3);
    expect(front[0]).toBeGreaterThan(front[1]);
    expect(front[1]).toBeGreaterThan(front[2]);
  });

  it("resolves the calculation schedule: manual shape rescaled to total GRP", () => {
    expect(
      resolvePeriodGrpSchedule({
        totalGrp: 1000,
        periods: 4,
        distribution: "even",
        customPeriodGrp: [1, 1, 2, 0],
        manualEnabled: true,
      }),
    ).toEqual([250, 250, 500, 0]);

    const resized = resolvePeriodGrpSchedule({
      totalGrp: 900,
      periods: 3,
      distribution: "even",
      customPeriodGrp: [100, 100, 100, 100, 100, 100],
      manualEnabled: true,
    });
    expect(resized).toHaveLength(3);
    expect(grpScheduleSum(resized)).toBeCloseTo(900, 9);

    expect(
      resolvePeriodGrpSchedule({
        totalGrp: 300,
        periods: 3,
        distribution: "even",
        customPeriodGrp: [1, 2, 3],
        manualEnabled: false,
      }),
    ).toEqual([100, 100, 100]);
  });

  it("summarizes the period allocation for the reach-curve tooltip", () => {
    expect(summarizePeriodAllocation([25, 25, 25, 25], 200, "week")).toBe(
      "4週: 50 / 50 / 50 / 50",
    );
    expect(
      summarizePeriodAllocation(
        Array.from({ length: 12 }, () => 10),
        240,
        "month",
      ),
    ).toBe("12か月: 平均 20/月");
    expect(
      summarizePeriodAllocation(
        [...Array.from({ length: 6 }, () => 12), ...Array.from({ length: 6 }, () => 8)],
        240,
        "month",
      ),
    ).toBe("12か月: 平均 20/月（16〜24）");
    expect(summarizePeriodAllocation([], 100, "week")).toBeNull();
  });
});
