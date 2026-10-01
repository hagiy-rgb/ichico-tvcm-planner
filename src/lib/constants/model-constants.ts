/**
 * 計算モデル関連の定数（マジックナンバーの一元管理）
 */

/** 絵柄ブロックとプリセットの一致判定に使う Jaccard 類似度の閾値 */
export const PRESET_JACCARD_THRESHOLD = 0.98;

/** 曜日時間区分データから推定する絵柄補正係数のクリップ下限 */
export const DAYPARTS_COEFFICIENT_MIN = 0.1;
/** 曜日時間区分データから推定する絵柄補正係数のクリップ上限 */
export const DAYPARTS_COEFFICIENT_MAX = 3;

/** 最適GRP探索（方式A・B）のデフォルト上限GRP */
export const OPTIMIZER_DEFAULT_MAX_GRP = 2000;

/** 方式B: 限界リーチ効率がピーク値の何倍まで低下したら頭打ちとみなすか */
export const MARGINAL_EFFICIENCY_RATIO = 0.5;

/** 感度分析: GRP逓減の洞察判定を行う最低GRP */
export const SENSITIVITY_GRP_THRESHOLD = 300;

/** 感度分析: GRP±20%でのリーチ差（人）がこの値未満なら「逓減」とみなす */
export const SENSITIVITY_GRP_DIMINISHING_DELTA = 3;

/**
 * 認知飽和曲線の「立ち上がり域」判定: 認知率 / MaxAwareness がこの値未満。
 * K のキャリブレーション誤差が結果に大きく効く帯。
 */
export const AWARENESS_RAMP_ZONE_MAX_RATIO = 0.2;
/** 認知飽和曲線の「飽和域」判定: 認知率 / MaxAwareness がこの値以上 */
export const AWARENESS_SATURATED_ZONE_MIN_RATIO = 0.8;
