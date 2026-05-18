import * as XLSX from "xlsx";
import { z } from "zod";
import { normalizeStationName } from "@/lib/masters/station-name-mapping";
import {
  DAYPARTS_WEEKDAYS,
  type DaypartsData,
  type DaypartsHourRatings,
  type DaypartsSheet,
  type DaypartsStationBlock,
} from "@/types/dayparts";

const TIME_LABEL_RE = /^(\d{1,2}):(\d{2})$/;
const WEEKDAY_SET = new Set<string>([
  ...DAYPARTS_WEEKDAYS,
  "平日平均",
  "週平均",
]);

const daypartsDataSchema = z.object({
  area: z.string().min(1),
  sheets: z
    .array(
      z.object({
        target: z.string().min(1),
        blocks: z.array(
          z.object({
            station: z.string().min(1),
            ratings: z.record(z.string(), z.record(z.string(), z.number())),
          }),
        ),
      }),
    )
    .min(1),
});

export type ParseDaypartsOptions = {
  areaHint?: string;
  fileName?: string;
  manualStationMap?: Record<string, string>;
};

export type ParseDaypartsResult = {
  data: DaypartsData;
  warnings: string[];
};

function cellString(value: unknown): string {
  if (value == null) {
    return "";
  }
  return String(value).trim();
}

function parseRatingValue(value: unknown): number | null {
  const raw = cellString(value);
  if (!raw || raw === "*" || raw === "-" || raw === "—") {
    return null;
  }
  const normalized = raw.replace(/%/g, "").replace(/,/g, "");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function sheetToMatrix(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
}

function extractMetadata(rows: unknown[][]): {
  area: string;
  periodStart: string;
  periodEnd: string;
  sampleSize: number;
  timeSlotUnit: number;
  ratingType: string;
} {
  let area = "";
  let periodStart = "";
  let periodEnd = "";
  let sampleSize = 0;
  let timeSlotUnit = 60;
  let ratingType = "average_household";

  for (let r = 0; r < Math.min(rows.length, 20); r += 1) {
    const label = cellString(rows[r]?.[0]);
    const value = cellString(rows[r]?.[1]);
    if (!label) {
      continue;
    }
    if (label.includes("地区") || label.includes("エリア")) {
      area = value || area;
    }
    if (label.includes("期間") || label.includes("調査期間")) {
      const parts = value.split(/[〜~\-–—]/).map((p) => p.trim());
      periodStart = parts[0] ?? value;
      periodEnd = parts[1] ?? parts[0] ?? "";
    }
    if (label.includes("サンプル")) {
      const n = Number(value.replace(/,/g, ""));
      if (Number.isFinite(n)) {
        sampleSize = n;
      }
    }
    if (label.includes("時間区分") || label.includes("区分")) {
      const unit = Number(value.replace(/[^\d]/g, ""));
      if (Number.isFinite(unit) && unit > 0) {
        timeSlotUnit = unit;
      }
    }
    if (label.includes("ターゲット") || label.includes("対象")) {
      ratingType = value || ratingType;
    }
  }

  return {
    area,
    periodStart,
    periodEnd,
    sampleSize,
    timeSlotUnit,
    ratingType,
  };
}

function findWeekdayColumns(row: unknown[]): {
  startCol: number;
  columns: { key: string; col: number }[];
} | null {
  const columns: { key: string; col: number }[] = [];
  for (let c = 0; c < row.length; c += 1) {
    const label = cellString(row[c]);
    if (WEEKDAY_SET.has(label)) {
      columns.push({ key: label, col: c });
    }
  }
  if (columns.length < 4) {
    return null;
  }
  return { startCol: columns[0].col, columns };
}

function findStationNameAbove(
  rows: unknown[][],
  headerRow: number,
): string {
  for (let r = headerRow - 1; r >= Math.max(0, headerRow - 5); r -= 1) {
    const name = cellString(rows[r]?.[0]);
    if (name && !WEEKDAY_SET.has(name) && !TIME_LABEL_RE.test(name)) {
      if (!name.includes("時間") && !name.includes("区分")) {
        return name;
      }
    }
  }
  return cellString(rows[headerRow]?.[0]) || "不明局";
}

function parseBlockFromHeader(
  rows: unknown[][],
  headerRow: number,
  endRow: number,
): { ratings: DaypartsStationBlock["ratings"] } {
  const header = rows[headerRow] ?? [];
  const layout = findWeekdayColumns(header);
  if (!layout) {
    return { ratings: {} };
  }

  const ratings: DaypartsStationBlock["ratings"] = {};

  for (let r = headerRow + 1; r < endRow; r += 1) {
    const row = rows[r] ?? [];
    const timeLabel =
      cellString(row[0]) || cellString(row[layout.startCol - 1]);
    if (!TIME_LABEL_RE.test(timeLabel)) {
      continue;
    }

    const hourRatings: DaypartsHourRatings = {};
    for (const { key, col } of layout.columns) {
      const val = parseRatingValue(row[col]);
      if (val != null) {
        hourRatings[key as keyof DaypartsHourRatings] = val;
      }
    }

    if (Object.keys(hourRatings).length > 0) {
      ratings[timeLabel] = hourRatings;
    }
  }

  return { ratings };
}

export function parseDaypartsMatrix(
  rows: unknown[][],
  sheetTarget: string,
  options: ParseDaypartsOptions = {},
): DaypartsSheet {
  const blocks: DaypartsStationBlock[] = [];
  const area = options.areaHint ?? extractMetadata(rows).area ?? "宮城";

  for (let r = 0; r < rows.length; r += 1) {
    const layout = findWeekdayColumns(rows[r] ?? []);
    if (!layout) {
      continue;
    }

    let endRow = rows.length;
    for (let next = r + 1; next < rows.length; next += 1) {
      if (findWeekdayColumns(rows[next] ?? [])) {
        endRow = next;
        break;
      }
    }

    const station = findStationNameAbove(rows, r);
    const { ratings } = parseBlockFromHeader(rows, r, endRow);
    if (Object.keys(ratings).length === 0) {
      continue;
    }

    blocks.push({
      station,
      stationNormalized: normalizeStationName(
        area,
        station,
        options.manualStationMap,
      ),
      ratings,
    });

    r = endRow - 1;
  }

  return { target: sheetTarget, blocks };
}

export function parseDaypartsWorkbook(
  buffer: ArrayBuffer,
  options: ParseDaypartsOptions = {},
): ParseDaypartsResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const warnings: string[] = [];
  const sheets: DaypartsSheet[] = [];
  const unmapped = new Set<string>();

  let meta = {
    area: options.areaHint ?? "",
    periodStart: "",
    periodEnd: "",
    sampleSize: 0,
    timeSlotUnit: 60,
    ratingType: "average_household",
  };

  for (const sheetName of workbook.SheetNames) {
    const matrix = sheetToMatrix(workbook.Sheets[sheetName]);
    if (matrix.length === 0) {
      continue;
    }
    const sheetMeta = extractMetadata(matrix);
    if (!meta.area && sheetMeta.area) {
      meta = { ...meta, ...sheetMeta };
    }
    const parsed = parseDaypartsMatrix(matrix, sheetName, {
      ...options,
      areaHint: meta.area || options.areaHint,
    });
    if (parsed.blocks.length > 0) {
      sheets.push(parsed);
    }
  }

  if (sheets.length === 0) {
    throw new Error(
      "曜日・時間区分の表形式を検出できませんでした。PM Plus形式のExcelか確認してください。",
    );
  }

  const area = meta.area || options.areaHint || "宮城";

  for (const sheet of sheets) {
    for (const block of sheet.blocks) {
      if (!block.stationNormalized) {
        unmapped.add(block.station);
        warnings.push(`局名をマッピングできません: ${block.station}`);
      }
    }
  }

  const id = `dayparts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const data: DaypartsData = {
    id,
    area,
    periodStart: meta.periodStart,
    periodEnd: meta.periodEnd,
    sampleSize: meta.sampleSize,
    timeSlotUnit: meta.timeSlotUnit,
    ratingType: meta.ratingType,
    importedAt: new Date().toISOString(),
    fileName: options.fileName ?? "import.xlsx",
    sheets,
    unmappedStations: [...unmapped],
  };

  const validated = daypartsDataSchema.safeParse({
    area: data.area,
    sheets: data.sheets.map((s) => ({
      target: s.target,
      blocks: s.blocks.map((b) => ({
        station: b.station,
        ratings: b.ratings,
      })),
    })),
  });

  if (!validated.success) {
    throw new Error("インポートデータの検証に失敗しました");
  }

  return { data, warnings };
}
