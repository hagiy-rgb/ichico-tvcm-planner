/**
 * パーコスト（円/GRP）を円単位の整数に正規化する。
 * 負値・非数は 0（＝上書きなし。マスタ値を使用）として扱う。
 */
export function toPerCostYen(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function toHalfWidth(text: string): string {
  return text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/．/g, ".")
    .replace(/[－−]/g, "-");
}

/**
 * 入力・貼り付け文字列（"4,500円" "¥4500" "４５００" "4500.7" など）を整数円へ。
 * 数値として解釈できない場合は 0。
 */
export function sanitizePerCostInput(raw: string): number {
  const normalized = toHalfWidth(raw).replace(/[,，¥￥円\s]/g, "");
  if (normalized === "") {
    return 0;
  }
  return toPerCostYen(Number(normalized));
}

/** 局別パーコスト上書きを整数円に揃え、0以下（＝マスタ値を使う）の項目は除く */
export function normalizePerCostOverrides(
  overrides: Record<string, number> | null | undefined,
): Record<string, number> {
  const normalized: Record<string, number> = {};
  for (const [station, value] of Object.entries(overrides ?? {})) {
    const yen = toPerCostYen(value);
    if (yen > 0) {
      normalized[station] = yen;
    }
  }
  return normalized;
}
