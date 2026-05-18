import { z } from "zod";
import { CSV_EXPORT_VERSION } from "@/types/plan";
import type { SimulationInput } from "@/types/simulation";
import type { CsvRow } from "./export";

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

/**
 * エクスポートCSVから SimulationInput を復元（結果は呼び出し側で再計算）
 */
export function simulationInputFromCsvRows(rows: CsvRow[]): SimulationInput {
  const version = getValue(rows, "meta", "format_version");
  if (version && version !== CSV_EXPORT_VERSION) {
    throw new Error(`未対応のCSVバージョンです: ${version}`);
  }

  const stationsRaw = getValue(rows, "input", "selectedStations");
  const selectedStations = stationsRaw
    ? stationsRaw.split("|").filter(Boolean)
    : [];

  const grpAllocation = getValue(rows, "input", "grpAllocation");
  const validAllocation =
    grpAllocation === "lump_sum" || grpAllocation === "even_weekly"
      ? grpAllocation
      : "even_weekly";

  return {
    area: getValue(rows, "input", "area") ?? "宮城",
    target: getValue(rows, "input", "target") ?? "個人全体",
    industryCode: getValue(rows, "input", "industryCode") ?? "FMCG_FOOD",
    creativePattern: {
      presetName:
        (getValue(rows, "input", "patternPreset") as SimulationInput["creativePattern"]["presetName"]) ??
        "ヨの字",
      blocks: [],
    },
    funnelStage:
      (getValue(rows, "input", "funnelStage") as SimulationInput["funnelStage"]) ??
      "awareness",
    grp: parseNumber(getValue(rows, "input", "grp"), 100),
    campaignWeeks: parseNumber(getValue(rows, "input", "campaignWeeks"), 4),
    grpAllocation: validAllocation,
    selectedStations,
    cmLength: parseNumber(getValue(rows, "input", "cmLength"), 30) as 15 | 30 | 60,
    daypartsId: getValue(rows, "input", "daypartsId") || null,
    coefficients: {
      lambdaWeekly: parseNumber(getValue(rows, "coeff", "lambdaWeekly"), 0.58),
      alphaConversion: parseNumber(getValue(rows, "coeff", "alphaConversion"), 0.3),
      alphaAwareness: parseNumber(getValue(rows, "coeff", "alphaAwareness"), 0.06),
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
