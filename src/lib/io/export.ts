import { CSV_EXPORT_VERSION } from "@/types/plan";
import type { SimulationInput, SimulationResults } from "@/types/simulation";

export type CsvRow = {
  section: string;
  key: string;
  value: string;
};

function row(section: string, key: string, value: string | number | boolean): CsvRow {
  return { section, key, value: String(value) };
}

export function buildSimulationCsvRows(
  input: SimulationInput,
  results: SimulationResults,
  meta?: { planName?: string },
): CsvRow[] {
  const rows: CsvRow[] = [
    row("meta", "format_version", CSV_EXPORT_VERSION),
    row("meta", "exported_at", new Date().toISOString()),
    row("meta", "plan_name", meta?.planName ?? ""),
    row("input", "area", input.area),
    row("input", "target", input.target),
    row("input", "industryCode", input.industryCode),
    row("input", "patternPreset", input.creativePattern.presetName),
    row("input", "grp", input.grp),
    row("input", "campaignWeeks", input.campaignWeeks),
    row("input", "grpAllocation", input.grpAllocation),
    row("input", "cmLength", input.cmLength),
    row("input", "funnelStage", input.funnelStage),
    row("input", "selectedStations", input.selectedStations.join("|")),
    row("input", "daypartsId", input.daypartsId ?? ""),
    row("coeff", "lambdaWeekly", input.coefficients.lambdaWeekly),
    row("coeff", "alphaConversion", input.coefficients.alphaConversion),
    row("coeff", "alphaAwareness", input.coefficients.alphaAwareness),
    row("coeff", "kPoisson", input.coefficients.kPoisson),
    row("coeff", "effectiveFrequency", input.coefficients.effectiveFrequency),
    row("kpi", "population", results.population),
    row("kpi", "reachRate", results.reachRate),
    row("kpi", "reachCount", results.reachCount),
    row("kpi", "awarenessRate", results.awarenessRate),
    row("kpi", "totalBudget", results.totalBudget),
    row("kpi", "cpm", results.cpm),
    row("kpi", "reachUnitPrice", results.reachUnitPrice),
    row("kpi", "perCost", results.perCost),
    row("kpi", "finalAdstock", results.finalAdstock),
    row("kpi", "webParityGrp", results.optimalGrp.webParityGrp ?? ""),
    row("kpi", "marginalEfficiencyGrp", results.optimalGrp.marginalEfficiencyGrp ?? ""),
  ];

  for (const point of results.reachCurve) {
    rows.push(
      row(
        "reach_curve",
        String(point.grp),
        `${point.reachRate},${point.reachCount}`,
      ),
    );
  }

  for (const point of results.awarenessCurve) {
    rows.push(
      row(
        "awareness_curve",
        String(point.week),
        `${point.grp},${point.adstock},${point.awarenessRate}`,
      ),
    );
  }

  for (const station of results.stationReachRows) {
    rows.push(
      row(
        "station_reach",
        station.station,
        `${station.reachRate},${station.reachCount},${station.grp}`,
      ),
    );
  }

  return rows;
}

export function serializeSimulationCsv(
  input: SimulationInput,
  results: SimulationResults,
  meta?: { planName?: string },
): string {
  const rows = buildSimulationCsvRows(input, results, meta);
  const header = "section,key,value";
  const body = rows.map((r) =>
    [r.section, r.key, r.value.replace(/,/g, "，")].join(","),
  );
  return [header, ...body].join("\n");
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "simulation";
}
