/** CM秒数（15/30/60）を30秒基準に正規化した倍率 */
export function cmLengthRatio(cmLength: 15 | 30 | 60): number {
  return cmLength / 30;
}

/**
 * 同一GRP表示値でのリーチ・認知用の実効GRP。
 * 長尺ほど1GRPあたりの接触機会が少ない想定（30秒基準）。
 */
export function grpForReachAndAwareness(
  grp: number,
  cmLength: 15 | 30 | 60,
): number {
  const ratio = cmLengthRatio(cmLength);
  return ratio > 0 ? grp / ratio : grp;
}

/** 出稿単価（パーコスト）への秒数補正。長尺ほど1GRPあたりの費用が高い想定。 */
export function perCostForCmLength(
  perCost: number,
  cmLength: 15 | 30 | 60,
): number {
  return perCost * cmLengthRatio(cmLength);
}
