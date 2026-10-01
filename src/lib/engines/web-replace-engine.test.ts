import { describe, expect, it } from "vitest";
import { buildWebReplaceSuggestion } from "./web-replace-engine";
import type { ReachCurvePoint } from "@/types/simulation";

function point(
  grp: number,
  reachCount: number,
  perCost: number,
): ReachCurvePoint {
  const budget = grp * perCost;
  return {
    grp,
    reachRate: reachCount / 2_000_000,
    reachCount,
    reachUnitPrice: budget / ((reachCount / 2_000_000) * 100),
    reachPersonUnitPrice: reachCount > 0 ? budget / reachCount : Infinity,
  };
}

describe("buildWebReplaceSuggestion", () => {
  it("computes replaceable budget as (planGrp - keepGrp) * perCost", () => {
    const perCost = 4500;
    const curve = [
      point(1000, 2_098_000, perCost), // ~2.14 円/人
      point(1100, 2_164_000, perCost), // ~2.29
      point(1110, 2_169_000, perCost), // ~2.30+
      point(1200, 2_203_000, perCost), // ~2.45
    ];
    const suggestion = buildWebReplaceSuggestion({
      planGrp: 1200,
      perCost,
      webUnitPriceYen: 2.3,
      reachCurve: curve,
      tvPersonUnitPriceAtPlan: (1200 * perCost) / 2_203_000,
    });

    expect(suggestion).not.toBeNull();
    expect(suggestion!.tvKeepGrp).toBe(1100);
    expect(suggestion!.replaceableGrp).toBe(100);
    expect(suggestion!.replaceableBudget).toBe(450_000);
  });

  it("returns null when web unit price is not set", () => {
    expect(
      buildWebReplaceSuggestion({
        planGrp: 1200,
        perCost: 4500,
        webUnitPriceYen: null,
        reachCurve: [],
        tvPersonUnitPriceAtPlan: 2.5,
      }),
    ).toBeNull();
  });
});
