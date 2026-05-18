export function formatNumber(value: number, fractionDigits = 0): string {
  return value.toLocaleString("ja-JP", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

export function formatYen(value: number): string {
  if (value >= 100_000_000) {
    return `¥${formatNumber(value / 100_000_000, 1)}億`;
  }
  if (value >= 10_000) {
    return `¥${formatNumber(Math.round(value / 10_000))}万`;
  }
  return `¥${formatNumber(Math.round(value))}`;
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${formatNumber(value, fractionDigits)}%`;
}
