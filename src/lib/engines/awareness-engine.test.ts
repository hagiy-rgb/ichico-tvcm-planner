import { describe, expect, it } from "vitest";
import {
  awarenessPercentFromAdstock,
  calculateAwareness,
  classifyAwarenessZone,
  impactFactorForWeeks,
  iterateAdstock,
  lambdaForGranularity,
  lambdaForWeeks,
  periodImpactFactor,
  type AwarenessInput,
} from "./awareness-engine";
import { buildPresetGrpSchedule, WEEKS_PER_MONTH } from "./grp-schedule";

const saturation = { maxAwareness: 30, halfSaturationAdstock: 50 };

function awarenessInput(
  overrides: Partial<AwarenessInput> & Pick<AwarenessInput, "periodGrp">,
): AwarenessInput {
  return {
    granularity: "week",
    lambdaWeekly: 0.58,
    alphaConversion: 0.3,
    patternCoefficient: 1,
    ...saturation,
    ...overrides,
  };
}

describe("awareness-engine", () => {
  it("accumulates adstock with decay", () => {
    const series = iterateAdstock([100, 0, 0], 0.5, 0.3, 1.05);
    expect(series[0]).toBeCloseTo(31.5, 1);
    expect(series[1]).toBeCloseTo(15.75, 1);
    expect(series[2]).toBeCloseTo(7.875, 1);
  });

  it("converts adstock with the Michaelis-Menten saturation curve", () => {
    expect(awarenessPercentFromAdstock(0, 30, 50)).toBe(0);
    // Adstock = K で MaxAwareness の半分
    expect(awarenessPercentFromAdstock(50, 30, 50)).toBeCloseTo(15, 10);
    expect(awarenessPercentFromAdstock(150, 30, 50)).toBeCloseTo(22.5, 10);
  });

  it("approaches MaxAwareness asymptotically instead of clamping at 100%", () => {
    const values = [10, 100, 1_000, 10_000, 1_000_000].map((a) =>
      awarenessPercentFromAdstock(a, 30, 50),
    );
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
    for (const v of values) {
      expect(v).toBeLessThan(30);
    }
    expect(values[values.length - 1]).toBeGreaterThan(29.99);
  });

  it("calculates awareness for FMCG-like inputs", () => {
    const result = calculateAwareness(
      awarenessInput({
        periodGrp: buildPresetGrpSchedule(1000, 4, "even"),
        patternCoefficient: 1.05,
      }),
    );

    expect(result.awarenessRate).toBeGreaterThan(0);
    expect(result.awarenessRate).toBeLessThan(saturation.maxAwareness);
    expect(result.awarenessCurve).toHaveLength(4);
    expect(result.awarenessCurve[0].periodLabel).toBe("第1週");
    expect(result.finalAdstock).toBeGreaterThan(0);
    expect(result.lambdaPeriod).toBe(0.58);
    expect(result.periodImpactFactor).toBe(1);
    expect(result.saturationRatio).toBeCloseTo(
      result.awarenessRate / saturation.maxAwareness,
      10,
    );
  });

  it("applies the effective GRP multiplier (CM length) to the adstock input only", () => {
    const base = calculateAwareness(awarenessInput({ periodGrp: [100, 100] }));
    const half = calculateAwareness(
      awarenessInput({ periodGrp: [100, 100], effectiveGrpMultiplier: 0.5 }),
    );
    expect(half.awarenessCurve[0].grp).toBe(100);
    expect(half.awarenessCurve[0].effectiveGrp).toBe(50);
    expect(half.finalAdstock).toBeCloseTo(base.finalAdstock / 2, 10);
  });

  it("classifies the saturation zone by awareness / MaxAwareness", () => {
    expect(classifyAwarenessZone(0.1)).toBe("ramp");
    expect(classifyAwarenessZone(0.5)).toBe("effective");
    expect(classifyAwarenessZone(0.85)).toBe("saturated");

    const heavy = calculateAwareness(
      awarenessInput({ periodGrp: buildPresetGrpSchedule(20_000, 4, "even") }),
    );
    expect(heavy.zone).toBe("saturated");
    expect(heavy.awarenessRate).toBeLessThan(saturation.maxAwareness);
  });
});

describe("awareness-engine period granularity", () => {
  it("converts λ to the monthly period as λ_m = λ_w^4.345", () => {
    expect(lambdaForGranularity(0.58, "week")).toBe(0.58);
    expect(lambdaForGranularity(0.58, "month")).toBeCloseTo(
      0.58 ** WEEKS_PER_MONTH,
      12,
    );
    expect(lambdaForGranularity(0.58, "month")).toBeCloseTo(0.0938, 3);
    expect(lambdaForGranularity(1.2, "month")).toBe(1);
    expect(lambdaForGranularity(-0.1, "month")).toBe(0);
  });

  it("derives the monthly impact factor from within-month decay", () => {
    expect(periodImpactFactor(0.58, "week")).toBe(1);
    expect(periodImpactFactor(0.58, "month")).toBeCloseTo(
      (1 - 0.58 ** WEEKS_PER_MONTH) / (WEEKS_PER_MONTH * (1 - 0.58)),
      12,
    );
    // 残存なし（λ=0）では月内の最終週分だけが月末に残る
    expect(periodImpactFactor(0, "month")).toBeCloseTo(1 / WEEKS_PER_MONTH, 12);
    // 減衰なし（λ=1）では投下量がそのまま積み上がる
    expect(periodImpactFactor(1, "month")).toBe(1);
  });

  it("matches the weekly simulation at period ends for an integer-week period", () => {
    const lambdaWeekly = 0.62;
    const alpha = 0.3;
    const k = 1.1;
    const weeksPerPeriod = 4;
    const periodGrp = [400, 120, 0, 260];

    const weeklyGrp = periodGrp.flatMap((grp) =>
      Array.from({ length: weeksPerPeriod }, () => grp / weeksPerPeriod),
    );
    const weekly = iterateAdstock(weeklyGrp, lambdaWeekly, alpha, k);
    const periodic = iterateAdstock(
      periodGrp,
      lambdaForWeeks(lambdaWeekly, weeksPerPeriod),
      alpha * impactFactorForWeeks(lambdaWeekly, weeksPerPeriod),
      k,
    );

    periodic.forEach((adstock, index) => {
      expect(adstock).toBeCloseTo(weekly[(index + 1) * weeksPerPeriod - 1], 9);
    });
  });

  it("keeps the steady-state awareness level independent of granularity", () => {
    const perWeekGrp = 80;
    const weekly = calculateAwareness(
      awarenessInput({ periodGrp: Array.from({ length: 104 }, () => perWeekGrp) }),
    );
    const monthly = calculateAwareness(
      awarenessInput({
        granularity: "month",
        periodGrp: Array.from({ length: 24 }, () => perWeekGrp * WEEKS_PER_MONTH),
      }),
    );
    const steadyState = (0.3 * perWeekGrp) / (1 - 0.58);

    expect(weekly.finalAdstock).toBeCloseTo(steadyState, 6);
    expect(monthly.finalAdstock).toBeCloseTo(steadyState, 6);
    expect(monthly.awarenessRate).toBeCloseTo(weekly.awarenessRate, 6);
  });

  it("approximates the equivalent weekly plan for an even three-month campaign", () => {
    const weeks = Math.round(3 * WEEKS_PER_MONTH);
    const monthly = calculateAwareness(
      awarenessInput({
        granularity: "month",
        periodGrp: buildPresetGrpSchedule(1200, 3, "even"),
      }),
    );
    const weekly = calculateAwareness(
      awarenessInput({ periodGrp: buildPresetGrpSchedule(1200, weeks, "even") }),
    );

    expect(monthly.awarenessCurve).toHaveLength(3);
    expect(monthly.awarenessCurve[2].periodLabel).toBe("第3月");
    expect(weekly.awarenessCurve).toHaveLength(weeks);
    expect(
      Math.abs(monthly.awarenessRate - weekly.awarenessRate) / weekly.awarenessRate,
    ).toBeLessThan(0.01);
  });

  it("reflects monthly timing: back-loaded plans end higher than front-loaded ones", () => {
    const front = calculateAwareness(
      awarenessInput({ granularity: "month", periodGrp: [600, 400, 200] }),
    );
    const back = calculateAwareness(
      awarenessInput({ granularity: "month", periodGrp: [200, 400, 600] }),
    );

    expect(back.awarenessRate).toBeGreaterThan(front.awarenessRate);
    expect(front.awarenessCurve[0].awarenessRate).toBeGreaterThan(
      back.awarenessCurve[0].awarenessRate,
    );
  });

  it("decays faster per period in monthly planning, so a gap month loses most of the stock", () => {
    const monthly = calculateAwareness(
      awarenessInput({ granularity: "month", periodGrp: [500, 0] }),
    );
    const weekly = calculateAwareness(awarenessInput({ periodGrp: [500, 0] }));

    const monthlyRetention =
      monthly.awarenessCurve[1].adstock / monthly.awarenessCurve[0].adstock;
    const weeklyRetention =
      weekly.awarenessCurve[1].adstock / weekly.awarenessCurve[0].adstock;
    expect(monthlyRetention).toBeCloseTo(0.58 ** WEEKS_PER_MONTH, 10);
    expect(weeklyRetention).toBeCloseTo(0.58, 10);
  });
});
