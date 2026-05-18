import { describe, expect, it } from "vitest";
import { poissonCDF, poissonPMF } from "./poisson";

describe("poisson", () => {
  it("poissonCDF(5, 6) matches Excel POISSON.DIST(5,6,TRUE)", () => {
    expect(poissonCDF(5, 6)).toBeCloseTo(0.4457, 3);
  });

  it("poissonPMF sums to approximately 1 for moderate lambda", () => {
    const lambda = 10;
    let sum = 0;
    for (let k = 0; k <= 100; k += 1) {
      sum += poissonPMF(k, lambda);
    }
    expect(sum).toBeCloseTo(1, 5);
  });

  it("handles large lambda without overflow", () => {
    const result = poissonCDF(50, 800);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});
