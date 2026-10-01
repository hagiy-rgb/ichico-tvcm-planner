export function formatNumber(value: number, fractionDigits = 0): string {
  return value.toLocaleString("ja-JP", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

/** GRP表記: 小数第1位まで（第2位四捨五入） */
export function formatGrp(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return formatNumber(Math.round(value * 10) / 10, 1);
}

/**
 * 出稿金額など円表記: 1円単位（四捨五入）。万・億への省略はしない。
 */
export function formatYen(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `¥${formatNumber(Math.round(value))}`;
}

/** リーチ人数単価: 小数第1位まで（第2位四捨五入） */
export function formatPersonUnitPrice(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `¥${formatNumber(Math.round(value * 10) / 10, 1)}`;
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${formatNumber(value, fractionDigits)}%`;
}

/** 目安本数: 小数第1位切り捨て（= 整数への切り捨て） */
export function formatSpotCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "—";
  return formatNumber(Math.floor(value));
}
