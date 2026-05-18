import { describe, expect, it } from "vitest";
import { calculateOptimalGrp, findMarginalEfficiencyGrp } from "./optimizer";

const baseCtx = {
  population: 2_249_000,
  perCost: 4500,
  effectiveFrequency: 6,
  kEffective: 0.0105,
  webVideoCpm: 2.3,
  maxGrp: 500,
};

describe("optimizer", () => {
  it("finds web parity GRP", () => {
    const result = calculateOptimalGrp(baseCtx);
    expect(result.webParityGrp).not.toBeNull();
    expect(result.webParityGrp!).toBeGreaterThan(0);
  });

  it("finds marginal efficiency GRP", () => {
    const grp = findMarginalEfficiencyGrp(baseCtx);
    expect(grp).not.toBeNull();
    expect(grp!).toBeGreaterThan(1);
  });
});
