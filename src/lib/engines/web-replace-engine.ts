import type { ReachCurvePoint } from "@/types/simulation";
import type { WebReplaceSuggestion } from "@/types/web-replace";
import { formatNumber, formatYen } from "@/lib/utils/number-format";

/**
 * TVリーチ人数単価（円/人）が web 単価以下にとどまる最大GRPを探し、
 * 計画GRP超過分を動画広告へリプレイスできる余地として返す。
 *
 * Excel互換: リプレイス金額 = (計画GRP − 交差GRP) × 加重平均パーコスト
 */
export function buildWebReplaceSuggestion(params: {
  planGrp: number;
  perCost: number;
  webUnitPriceYen: number | null | undefined;
  reachCurve: ReachCurvePoint[];
  tvPersonUnitPriceAtPlan: number | null;
}): WebReplaceSuggestion | null {
  const web = params.webUnitPriceYen;
  if (web == null || !Number.isFinite(web) || web <= 0) {
    return null;
  }
  if (!(params.planGrp > 0) || !(params.perCost > 0)) {
    return null;
  }

  const points = [...params.reachCurve]
    .filter((p) => p.grp > 0 && p.grp <= params.planGrp + 1e-9)
    .sort((a, b) => a.grp - b.grp);

  let tvKeepGrp: number | null = null;
  for (const point of points) {
    const personPrice =
      point.reachPersonUnitPrice ??
      (point.reachCount > 0
        ? (point.grp * params.perCost) / point.reachCount
        : Number.POSITIVE_INFINITY);
    if (Number.isFinite(personPrice) && personPrice <= web) {
      tvKeepGrp = point.grp;
    }
  }

  // 計画GRPちょうどが曲線点に無い場合は計画点でも判定
  if (
    params.tvPersonUnitPriceAtPlan != null &&
    Number.isFinite(params.tvPersonUnitPriceAtPlan) &&
    params.tvPersonUnitPriceAtPlan <= web
  ) {
    tvKeepGrp = Math.max(tvKeepGrp ?? 0, params.planGrp);
  }

  if (tvKeepGrp == null) {
    return {
      webUnitPriceYen: web,
      tvKeepGrp: null,
      replaceableGrp: params.planGrp,
      replaceableBudget: params.planGrp * params.perCost,
      planGrp: params.planGrp,
      tvPersonUnitPriceAtPlan: params.tvPersonUnitPriceAtPlan,
      message: `計画GRP帯ではTVのリーチ人数単価が web動画 ${formatYen(web)}/人 を下回りません。予算 ${formatYen(params.planGrp * params.perCost)} を動画広告側の比較対象として検討できます。`,
    };
  }

  const replaceableGrp = Math.max(0, params.planGrp - tvKeepGrp);
  const replaceableBudget = replaceableGrp * params.perCost;

  if (replaceableGrp <= 0) {
    return {
      webUnitPriceYen: web,
      tvKeepGrp,
      replaceableGrp: 0,
      replaceableBudget: 0,
      planGrp: params.planGrp,
      tvPersonUnitPriceAtPlan: params.tvPersonUnitPriceAtPlan,
      message: `計画GRP ${formatNumber(params.planGrp)} まではTVのリーチ人数単価が web ${formatYen(web)}/人 以下です。この計画内では動画広告へのリプレイス余地は小さいです。`,
    };
  }

  return {
    webUnitPriceYen: web,
    tvKeepGrp,
    replaceableGrp,
    replaceableBudget,
    planGrp: params.planGrp,
    tvPersonUnitPriceAtPlan: params.tvPersonUnitPriceAtPlan,
    message: `TVは概ね GRP ${formatNumber(tvKeepGrp)} までが web動画（${formatYen(web)}/人）より効率的です。計画 ${formatNumber(params.planGrp)} GRP のうち残り ${formatNumber(Math.round(replaceableGrp))} GRP（約 ${formatYen(replaceableBudget)}）を動画広告へリプレイスする余地があります。`,
  };
}
