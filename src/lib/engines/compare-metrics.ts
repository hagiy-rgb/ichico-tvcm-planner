import type { SavedPlanRecord } from "@/types/plan";

export type CompareMetricId =
  | "grp"
  | "reachRate"
  | "reachCount"
  | "awarenessRate"
  | "totalBudget"
  | "cpm"
  | "reachUnitPrice";

export type CompareMetricDef = {
  id: CompareMetricId;
  label: string;
  higherIsBetter: boolean;
};

export const COMPARE_METRICS: CompareMetricDef[] = [
  { id: "grp", label: "GRP", higherIsBetter: false },
  { id: "reachRate", label: "リーチ率", higherIsBetter: true },
  { id: "reachCount", label: "リーチ人数", higherIsBetter: true },
  { id: "awarenessRate", label: "広告認知率", higherIsBetter: true },
  { id: "totalBudget", label: "出稿総額", higherIsBetter: false },
  { id: "cpm", label: "CPM", higherIsBetter: false },
  { id: "reachUnitPrice", label: "リーチ単価", higherIsBetter: false },
];

export function metricValue(
  plan: SavedPlanRecord,
  id: CompareMetricId,
): number | null {
  const { input, results } = plan;
  switch (id) {
    case "grp":
      return input.grp;
    case "reachRate":
      return results.reachRate * 100;
    case "reachCount":
      return results.reachCount;
    case "awarenessRate":
      return results.awarenessRate;
    case "totalBudget":
      return results.totalBudget;
    case "cpm":
      return results.cpm;
    case "reachUnitPrice":
      return Number.isFinite(results.reachUnitPrice)
        ? results.reachUnitPrice
        : null;
    default:
      return null;
  }
}

export function metricDelta(
  plan: SavedPlanRecord,
  baseline: SavedPlanRecord,
  id: CompareMetricId,
): number | null {
  const value = metricValue(plan, id);
  const base = metricValue(baseline, id);
  if (value == null || base == null) return null;
  return value - base;
}
