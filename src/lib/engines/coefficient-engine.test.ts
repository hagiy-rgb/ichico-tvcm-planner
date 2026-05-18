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

  it("warns when lambda exceeds 0.95", () => {
    const industry = getIndustryByCode("FMCG_FOOD");
    expect(industry).toBeDefined();
    const warnings = validateCoefficients(
      {
        lambdaWeekly: 0.96,
        alphaConversion: 0.3,
        alphaAwareness: 0.06,
        kPoisson: 0.01,
        effectiveFrequency: 6,
      },
      {
        lambda: industry!.lambda_weekly,
        alphaAwareness: industry!.alpha_awareness,
      },
    );
    expect(warnings.some((w) => w.field === "lambdaWeekly")).toBe(true);
  });

  it("computes half-life from lambda", () => {
    const half = halfLifeWeeks(0.58);
    expect(half).not.toBeNull();
    expect(half!).toBeGreaterThan(0);
  });
});
