/**
 * CM秒数を15秒基準に正規化した倍率。
 * マスタ／画面入力のパーコストは15秒実勢が標準（ローカル局の慣行）。
 */
export function cmLengthRatio(cmLength: 15 | 30 | 60): number {
  return cmLength / 15;
}

/**
 * リーチ・認知用の実効GRP。
 * GRPの定義自体は秒数に依存しないため、入力GRPをそのまま用いる。
 * （長尺クリエイティブの認知効率差は別係数で扱う想定）
 */
export function grpForReachAndAwareness(
  grp: number,
  _cmLength: 15 | 30 | 60,
): number {
  return grp;
}

/**
 * 出稿単価（パーコスト）への秒数補正。
 * 15秒=1倍、30秒=2倍、60秒=4倍（15秒単価を基準に尺比例）。
 */
export function perCostForCmLength(
  perCost: number,
  cmLength: 15 | 30 | 60,
): number {
  return perCost * cmLengthRatio(cmLength);
}
