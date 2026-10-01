/** チャート共通のユーティリティとスタイル定義 */

/** CSVエクスポート用のエスケープ（カンマ・改行・引用符を含む値を守る） */
export function csvEscape(value: string | number | boolean): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CartesianGrid の共通スタイル */
export const CHART_GRID_PROPS = {
  strokeDasharray: "3 3",
  stroke: "#e2e8f0",
} as const;

/** 系列カラーパレット（マルチターゲット等） */
export const CHART_SERIES_COLORS = [
  "#0f172a",
  "#0369a1",
  "#b45309",
  "#7c3aed",
  "#be123c",
  "#0d9488",
  "#ca8a04",
  "#4f46e5",
  "#15803d",
  "#c2410c",
  "#6d28d9",
] as const;
