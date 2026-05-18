export type CostInput = {
  grp: number;
  perCost: number;
  population: number;
  reachRate: number;
};

export type CostResult = {
  totalBudget: number;
  cpm: number;
  reachUnitPrice: number;
  displayUnitPrice: number;
};

/**
 * 出稿総額・CPM・リーチ単価を算出
 * - 出稿総額 = GRP × パーコスト
 * - CPM = 出稿総額 / (GRP × 母数 / 100,000)
 * - リーチ単価 = 出稿総額 / リーチ率[%]
 */
export function calculateCost(input: CostInput): CostResult {
  const { grp, perCost, population, reachRate } = input;

  if (grp < 0) {
    throw new Error("GRPは0以上である必要があります");
  }
  if (perCost < 0) {
    throw new Error("パーコストは0以上である必要があります");
  }
  if (population <= 0) {
    throw new Error("視聴人口は0より大きい必要があります");
  }

  const totalBudget = grp * perCost;
  const impressions = (grp * population) / 100;
  const cpm = impressions > 0 ? totalBudget / (impressions / 1000) : 0;
  const displayUnitPrice = impressions > 0 ? totalBudget / impressions : 0;
  const reachPercent = reachRate * 100;
  const reachUnitPrice =
    reachPercent > 0 ? totalBudget / reachPercent : Number.POSITIVE_INFINITY;

  return {
    totalBudget,
    cpm,
    reachUnitPrice,
    displayUnitPrice,
  };
}
