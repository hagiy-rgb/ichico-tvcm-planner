import { CSV_EXPORT_VERSION } from "@/types/plan";
import type { SimulationInput, SimulationResults } from "@/types/simulation";
import { encodePatternBlocks } from "./pattern-blocks-codec";

export type CsvRow = {
  section: string;
  key: string;
  value: string;
};

function row(section: string, key: string, value: string | number | boolean): CsvRow {
  return { section, key, value: String(value) };
}

/** 局コード→値のマップを "局:値|局:値" に（値はURLエンコードしてCSV区切りと衝突させない） */
export function encodeStationMap(
  map: Record<string, string | number> | undefined,
): string {
  return Object.entries(map ?? {})
    .filter(([, value]) => value !== "" && value != null)
    .map(
      ([station, value]) =>
        `${encodeURIComponent(station)}:${encodeURIComponent(String(value))}`,
    )
    .join("|");
}

export function decodeStationMap(value: string | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  for (const pair of (value ?? "").split("|")) {
    const index = pair.indexOf(":");
    if (index <= 0) continue;
    try {
      map[decodeURIComponent(pair.slice(0, index))] = decodeURIComponent(
        pair.slice(index + 1),
      );
    } catch {
      // 壊れた項目は無視
    }
  }
  return map;
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
    // 単位の明示: rate系は *_decimal=小数(0-1) / *_percent=百分率(0-100)
    row("meta", "reach_curve_value_columns", "reachRateDecimal|reachCount"),
    row(
      "meta",
      "awareness_curve_value_columns",
      "grp|effectiveGrp|adstock|awarenessRatePercent",
    ),
    row("meta", "awareness_curve_period_unit", results.planningGranularity),
    row(
      "meta",
      "station_reach_value_columns",
      "reachRateDecimal|reachCount|grp|grpShareDecimal|perCost",
    ),
    row("input", "area", input.area),
    row("input", "target", input.target),
    row("input", "industryCode", input.industryCode),
    row("input", "patternPreset", input.creativePattern.presetName),
    row("input", "patternBlocks", encodePatternBlocks(input.creativePattern.blocks)),
    row("input", "grp", input.grp),
    row("input", "planningGranularity", results.planningGranularity),
    row("input", "campaignPeriods", results.campaignPeriods),
    row("input", "campaignWeeks", input.campaignWeeks),
    row("input", "grpDistribution", input.grpDistribution),
    row("input", "manualGrpEnabled", input.manualGrpEnabled ?? false),
    row(
      "input",
      "customPeriodGrp",
      input.manualGrpEnabled ? results.periodGrpSchedule.join("|") : "",
    ),
    row("input", "cmLength", input.cmLength),
    row("input", "funnelStage", input.funnelStage),
    row("input", "selectedStations", input.selectedStations.join("|")),
    row("input", "stationPerCosts", encodeStationMap(input.stationPerCosts)),
    row(
      "input",
      "stationDisplayNames",
      encodeStationMap(input.stationDisplayNames),
    ),
    row(
      "input",
      "stationGrpAllocation",
      input.stationGrpAllocation ?? results.stationGrpAllocation,
    ),
    row("input", "daypartsId", input.daypartsId ?? ""),
    row("coeff", "lambdaWeekly", input.coefficients.lambdaWeekly),
    row("coeff", "alphaConversion", input.coefficients.alphaConversion),
    row("coeff", "maxAwareness", input.coefficients.maxAwareness),
    row("coeff", "halfSaturationAdstock", input.coefficients.halfSaturationAdstock),
    row("coeff", "kPoisson", input.coefficients.kPoisson),
    row("coeff", "effectiveFrequency", input.coefficients.effectiveFrequency),
    row("kpi", "population", results.population),
    row("kpi", "reachRateDecimal", results.reachRate),
    row("kpi", "reachRatePercent", results.reachRate * 100),
    row("kpi", "reachCount", results.reachCount),
    row("kpi", "awarenessRatePercent", results.awarenessRate),
    row("kpi", "totalBudget", results.totalBudget),
    row("kpi", "cpm", results.cpm),
    row("kpi", "reachUnitPrice", results.reachUnitPrice),
    row("kpi", "perCost", results.perCost),
    row("kpi", "finalAdstock", results.finalAdstock),
    row("kpi", "lambdaPeriod", results.lambdaPeriod),
    row("kpi", "periodImpactFactor", results.periodImpactFactor),
    row("kpi", "webParityGrp", results.optimalGrp.webParityGrp ?? ""),
    row("kpi", "marginalEfficiencyGrp", results.optimalGrp.marginalEfficiencyGrp ?? ""),
    row("kpi", "minReachUnitPriceGrp", results.optimalGrp.minReachUnitPriceGrp ?? ""),
    row("kpi", "minReachUnitPrice", results.optimalGrp.minReachUnitPrice ?? ""),
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
        String(point.period),
        `${point.grp},${point.effectiveGrp},${point.adstock},${point.awarenessRate}`,
      ),
    );
  }

  for (const station of results.stationReachRows) {
    const displayName =
      input.stationDisplayNames?.[station.station] ?? station.station;
    rows.push(
      row(
        "station_reach",
        displayName,
        `${station.reachRate},${station.reachCount},${station.grp},${station.grpShare},${station.perCost}`,
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
