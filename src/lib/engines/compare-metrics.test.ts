import { describe, expect, it } from "vitest";
import { createDefaultInput } from "@/lib/stores/simulation-store";
import type { SavedPlanRecord } from "@/types/plan";
import { runSimulation } from "./simulation-engine";
import { metricDelta, metricValue } from "./compare-metrics";

function makePlan(id: string, grp: number): SavedPlanRecord {
  const input = { ...createDefaultInput(), grp };
  return {
    id,
    meta: {
      name: id,
      clientName: "client",
      projectName: "project",
      contactPerson: "",
      memo: "",
    },
    savedAt: "2026-01-01T00:00:00.000Z",
    input,
    results: runSimulation(input),
  };
}

describe("compare-metrics", () => {
  it("reads GRP from input and reach rate as percent", () => {
    const plan = makePlan("a", 250);
    expect(metricValue(plan, "grp")).toBe(250);
    expect(metricValue(plan, "reachRate")).toBeCloseTo(
      plan.results.reachRate * 100,
      10,
    );
    expect(metricValue(plan, "awarenessRate")).toBe(plan.results.awarenessRate);
    expect(metricValue(plan, "totalBudget")).toBe(plan.results.totalBudget);
  });

  it("returns null for a non-finite reach unit price", () => {
    const plan = makePlan("zero", 0);
    const patched: SavedPlanRecord = {
      ...plan,
      results: { ...plan.results, reachUnitPrice: Number.POSITIVE_INFINITY },
    };
    expect(metricValue(patched, "reachUnitPrice")).toBeNull();
  });

  it("subtracts the first plan as the baseline", () => {
    const baseline = makePlan("base", 100);
    const challenger = makePlan("alt", 200);
    expect(metricDelta(challenger, baseline, "grp")).toBe(100);
    expect(metricDelta(baseline, baseline, "grp")).toBe(0);

    const reachDelta = metricDelta(challenger, baseline, "reachRate");
    expect(reachDelta).not.toBeNull();
    expect(reachDelta).toBeCloseTo(
      challenger.results.reachRate * 100 - baseline.results.reachRate * 100,
      10,
    );
  });

  it("returns null delta when either side lacks a finite value", () => {
    const baseline = makePlan("base", 100);
    const broken: SavedPlanRecord = {
      ...makePlan("alt", 100),
      results: {
        ...baseline.results,
        reachUnitPrice: Number.NaN,
      },
    };
    expect(metricDelta(broken, baseline, "reachUnitPrice")).toBeNull();
  });
});
