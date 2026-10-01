import { z } from "zod";
import { getAwarenessSaturationRanges } from "@/lib/engines/coefficient-engine";
import { getPresetBlocks } from "@/lib/engines/creative-pattern-engine";
import { normalizePlanningGranularity } from "@/lib/engines/grp-schedule";
import { normalizeStationGrpAllocation } from "@/lib/engines/station-engine";
import { CSV_SUPPORTED_VERSIONS } from "@/types/plan";
import type { SimulationInput } from "@/types/simulation";
import { decodeStationMap, type CsvRow } from "./export";
import { decodePatternBlocks } from "./pattern-blocks-codec";

const csvRowSchema = z.object({
  section: z.string(),
  key: z.string(),
  value: z.string(),
});

export function parseSimulationCsv(text: string): {
  rows: CsvRow[];
  version: string | null;
} {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length < 2) {
    throw new Error("CSVの行数が不足しています");
  }

  const header = lines[0].split(",");
  if (header.length < 3 || header[0] !== "section" || header[1] !== "key") {
    throw new Error(
      "CSV形式が不正です。ICHICO TVCM Planner のエクスポートCSVを使用してください",
    );
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const parts = lines[i].split(",");
    if (parts.length < 3) {
      continue;
    }
    const parsed = csvRowSchema.safeParse({
      section: parts[0],
      key: parts[1],
      value: parts.slice(2).join(","),
    });
    if (parsed.success) {
      rows.push(parsed.data);
    }
  }

  const versionRow = rows.find(
    (r) => r.section === "meta" && r.key === "format_version",
  );

  return {
    rows,
    version: versionRow?.value ?? null,
  };
}

function getValue(rows: CsvRow[], section: string, key: string): string | undefined {
  return rows.find((r) => r.section === section && r.key === key)?.value;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (value == null || value === "") {
    return fallback;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/** "25|25|50" → [25, 25, 50]。空・不正なら null */
function parseScheduleList(value: string | undefined): number[] | null {
  if (!value) return null;
  const list = value.split("|").map(Number);
  return list.length > 0 && list.every((n) => Number.isFinite(n) && n >= 0)
    ? list
    : null;
}

/**
 * エクスポートCSVから SimulationInput を復元（結果は呼び出し側で再計算）
 */
export function simulationInputFromCsvRows(rows: CsvRow[]): SimulationInput {
  const version = getValue(rows, "meta", "format_version");
  if (version && !CSV_SUPPORTED_VERSIONS.includes(version)) {
    throw new Error(`未対応のCSVバージョンです: ${version}`);
  }

  const stationsRaw = getValue(rows, "input", "selectedStations");
  const selectedStations = stationsRaw
    ? stationsRaw.split("|").filter(Boolean)
    : [];

  const grpDistributionRaw =
    getValue(rows, "input", "grpDistribution") ??
    getValue(rows, "input", "grpAllocation");
  const saturation = getAwarenessSaturationRanges();

  const presetName =
    (getValue(rows, "input", "patternPreset") as SimulationInput["creativePattern"]["presetName"]) ??
    "ヨの字";
  const patternBlocksRaw = getValue(rows, "input", "patternBlocks");
  const decodedBlocks =
    patternBlocksRaw != null ? decodePatternBlocks(patternBlocksRaw) : null;
  // patternBlocks 行が無い旧CSVのカスタム絵柄は、枠が復元できないためヨの字で代替する
  const blocks =
    decodedBlocks ??
    (presetName === "カスタム" ? getPresetBlocks("ヨの字") : []);

  return {
    area: getValue(rows, "input", "area") ?? "宮城",
    target: getValue(rows, "input", "target") ?? "個人全体",
    industryCode: getValue(rows, "input", "industryCode") ?? "FMCG_FOOD",
    creativePattern: {
      presetName,
      blocks,
    },
    funnelStage:
      (getValue(rows, "input", "funnelStage") as SimulationInput["funnelStage"]) ??
      "awareness",
    grp: parseNumber(getValue(rows, "input", "grp"), 100),
    planningGranularity: normalizePlanningGranularity(
      getValue(rows, "input", "planningGranularity"),
    ),
    campaignPeriods: getValue(rows, "input", "campaignPeriods")
      ? parseNumber(getValue(rows, "input", "campaignPeriods"), 4)
      : undefined,
    campaignWeeks: parseNumber(getValue(rows, "input", "campaignWeeks"), 4),
    manualGrpEnabled: getValue(rows, "input", "manualGrpEnabled") === "true",
    customPeriodGrp: parseScheduleList(getValue(rows, "input", "customPeriodGrp")),
    stationPerCosts: Object.fromEntries(
      Object.entries(decodeStationMap(getValue(rows, "input", "stationPerCosts")))
        .map(([station, value]) => [station, Number(value)] as const)
        .filter(([, value]) => Number.isFinite(value) && value > 0),
    ),
    stationDisplayNames: decodeStationMap(
      getValue(rows, "input", "stationDisplayNames"),
    ),
    grpDistribution:
      grpDistributionRaw === "front_heavy" ||
      grpDistributionRaw === "back_heavy" ||
      grpDistributionRaw === "even"
        ? grpDistributionRaw
        : grpDistributionRaw === "lump_sum"
          ? "front_heavy"
          : "even",
    selectedStations,
    stationGrpAllocation: normalizeStationGrpAllocation(
      getValue(rows, "input", "stationGrpAllocation"),
    ),
    cmLength: parseNumber(getValue(rows, "input", "cmLength"), 30) as 15 | 30 | 60,
    daypartsId: getValue(rows, "input", "daypartsId") || null,
    coefficients: {
      lambdaWeekly: parseNumber(getValue(rows, "coeff", "lambdaWeekly"), 0.58),
      alphaConversion: parseNumber(getValue(rows, "coeff", "alphaConversion"), 0.3),
      maxAwareness: parseNumber(
        getValue(rows, "coeff", "maxAwareness"),
        saturation.max_awareness.typical,
      ),
      halfSaturationAdstock: parseNumber(
        getValue(rows, "coeff", "halfSaturationAdstock"),
        saturation.half_saturation_adstock.typical,
      ),
      kPoisson: parseNumber(getValue(rows, "coeff", "kPoisson"), 0.01),
      effectiveFrequency: parseNumber(
        getValue(rows, "coeff", "effectiveFrequency"),
        6,
      ),
    },
  };
}

export function parseSimulationCsvToInput(text: string): SimulationInput {
  const { rows } = parseSimulationCsv(text);
  return simulationInputFromCsvRows(rows);
}
