/**
 * web動画広告へのリプレイス提案。
 * TVのリーチ人数単価（円/人）が web 単価を上回る帯の GRP を、
 * 動画広告へ振り替え可能な余地として算出する。
 */
export type WebReplaceSuggestion = {
  /** 入力された web ターゲットリーチ人数単価（円/人） */
  webUnitPriceYen: number;
  /** TVリーチ人数単価が web 以下にとどまる最大GRP（リプレイス開始点） */
  tvKeepGrp: number | null;
  /** リプレイス候補のGRP量 = max(0, 計画GRP − tvKeepGrp) */
  replaceableGrp: number;
  /** リプレイス候補金額 = replaceableGrp × 加重平均パーコスト（円） */
  replaceableBudget: number;
  /** 比較に使った計画GRP（上限） */
  planGrp: number;
  /** 計画GRP時点のTVリーチ人数単価（円/人） */
  tvPersonUnitPriceAtPlan: number | null;
  /** 提案文 */
  message: string;
};
