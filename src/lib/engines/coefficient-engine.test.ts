import { describe, expect, it } from "vitest";
import {
  buildRecommendedCoefficients,
  halfLifeWeeks,
  validateCoefficients,
} from "./coefficient-engine";
import { getIndustryByCode } from "@/lib/masters/industry-master";

describe("coefficient-engine", () => {
  it("builds recommended coefficients with funnel adjustment", () => {
    const coeffs = buildRecommendedCoefficients("FMCG_FOOD", "awareness");
    expect(coeffs.kPoisson).toBe(0.01);
    expect(coeffs.alphaConversion).toBe(0.3);
    expect(coeffs.lambdaWeekly).toBeGreaterThan(0.5);
    expect(coeffs.effectiveFrequency).toBe(6);
  });

  it("uses FSD saturation defaults (MaxAwareness 30%, K 50)", () => {
    const coeffs = buildRecommendedCoefficients("FMCG_FOOD", "awareness");
    expect(coeffs.maxAwareness).toBe(30);
    expect(coeffs.halfSaturationAdstock).toBe(50);
  });

  it("warns when lambda exceeds 0.95", () => {
    const industry = getIndustryByCode("FMCG_FOOD");
    expect(industry).toBeDefined();
    const warnings = validateCoefficients(
      {
        lambdaWeekly: 0.96,
        alphaConversion: 0.3,
        maxAwareness: 30,
        halfSaturationAdstock: 50,
        kPoisson: 0.01,
        effectiveFrequency: 6,
      },
      { lambda: industry!.lambda_weekly },
    );
    expect(warnings.some((w) => w.field === "lambdaWeekly")).toBe(true);
  });

  it("rejects MaxAwareness above 100% and non-positive K", () => {
    const industry = getIndustryByCode("FMCG_FOOD");
    const warnings = validateCoefficients(
      {
        ...buildRecommendedCoefficients("FMCG_FOOD", "awareness"),
        maxAwareness: 120,
        halfSaturationAdstock: 0,
      },
      { lambda: industry!.lambda_weekly },
    );
    expect(warnings.some((w) => w.field === "maxAwareness")).toBe(true);
    expect(warnings.some((w) => w.field === "halfSaturationAdstock")).toBe(true);
  });

  it("computes half-life from lambda", () => {
    const half = halfLifeWeeks(0.58);
    expect(half).not.toBeNull();
    expect(half!).toBeGreaterThan(0);
  });
});
