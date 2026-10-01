import {
  SENSITIVITY_GRP_DIMINISHING_DELTA,
  SENSITIVITY_GRP_THRESHOLD,
} from "@/lib/constants/model-constants";
import { getPresetBlocks } from "@/lib/engines/creative-pattern-engine";
import {
  simulateReach,
  type RunSimulationOptions,
} from "@/lib/engines/reach-context";
import { listStationsForArea } from "@/lib/masters/station-master";
import type { SimulationInput, SimulationResults } from "@/types/simulation";

export type TornadoRow = {
  id: string;
  label: string;
  low: number;
  high: number;
  baseline: number;
};

export type WaterfallRow = {
  name: string;
  base: number;
  delta: number;
  total: number;
};

export type LeverageInsight = {
  kind: "leverage" | "bottleneck";
  text: string;
};

export type LeverageAnalysis = {
  tornado: TornadoRow[];
  waterfall: WaterfallRow[];
  insights: LeverageInsight[];
  /** Tornado・レバレッジを踏まえた改善ストーリー（文章） */
  improvementStory: string;
};

/** 条件を振った場合のリーチ人数（本計算と同じ局合成・実効GRP・dayparts k を使用） */
function reachCountFor(
  input: SimulationInput,
  options: RunSimulationOptions,
): number {
  return simulateReach(input, options).reachCount;
}

function impactSpan(row: Omit<TornadoRow, "baseline"> & { span: number }): number {
  return row.span;
}

export function runReachTornado(
  input: SimulationInput,
  baseline: SimulationResults,
  options: RunSimulationOptions = {},
): TornadoRow[] {
  const baseReach = baseline.reachCount;
  const rows: Array<Omit<TornadoRow, "baseline"> & { span: number }> = [];

  const pushRow = (
    id: string,
    label: string,
    lowInput: SimulationInput,
    highInput: SimulationInput,
  ) => {
    const low = reachCountFor(lowInput, options);
    const high = reachCountFor(highInput, options);
    const min = Math.min(low, high);
    const max = Math.max(low, high);
    rows.push({
      id,
      label,
      low: min,
      high: max,
      span: max - min,
    });
  };

  pushRow("grp", "GRP", { ...input, grp: input.grp * 0.8 }, { ...input, grp: input.grp * 1.2 });

  const f = input.coefficients.effectiveFrequency;
  pushRow(
    "effectiveF",
    "有効F",
    {
      ...input,
      coefficients: {
        ...input.coefficients,
        effectiveFrequency: Math.max(1, f - 1),
      },
    },
    {
      ...input,
      coefficients: {
        ...input.coefficients,
        effectiveFrequency: f + 1,
      },
    },
  );

  if (input.creativePattern.presetName !== "全日") {
    pushRow(
      "pattern",
      "絵柄（全日）",
      {
        ...input,
        creativePattern: {
          presetName: "全日",
          blocks: getPresetBlocks("全日"),
        },
      },
      {
        ...input,
        creativePattern: {
          presetName: "逆L",
          blocks: getPresetBlocks("逆L"),
        },
      },
    );
  } else {
    pushRow(
      "pattern",
      "絵柄（逆L）",
      {
        ...input,
        creativePattern: {
          presetName: "全日",
          blocks: getPresetBlocks("全日"),
        },
      },
      {
        ...input,
        creativePattern: {
          presetName: "逆L",
          blocks: getPresetBlocks("逆L"),
        },
      },
    );
  }

  const allStations = listStationsForArea(input.area);
  if (
    allStations.length > input.selectedStations.length &&
    input.selectedStations.length > 0
  ) {
    pushRow(
      "stations",
      "局数（全局）",
      input,
      { ...input, selectedStations: allStations },
    );
  }

  // 局選定: 現状から1局減らした場合の影響（影響が大きい場合のみ上位に残る）
  if (input.selectedStations.length >= 3) {
    let worstDrop = 0;
    let worstStation = input.selectedStations[0];
    for (const station of input.selectedStations) {
      const reduced = input.selectedStations.filter((s) => s !== station);
      const reach = reachCountFor(
        { ...input, selectedStations: reduced },
        options,
      );
      const drop = baseReach - reach;
      if (drop > worstDrop) {
        worstDrop = drop;
        worstStation = station;
      }
    }
    if (worstDrop > 0) {
      pushRow(
        "dropStation",
        `局選定（${worstStation}除外）`,
        {
          ...input,
          selectedStations: input.selectedStations.filter(
            (s) => s !== worstStation,
          ),
        },
        input,
      );
    }
  }

  // 局配分: 均等 vs コスト加重（安い局に厚く）の差
  if (input.selectedStations.length >= 2) {
    pushRow(
      "allocation",
      "局GRP按分（均等↔コスト加重）",
      { ...input, stationGrpAllocation: "equal" },
      { ...input, stationGrpAllocation: "cost_weighted" },
    );
  }

  // CM秒数はシミュレーションで決定することが稀なため感度分析から除外

  // 影響がごく小さい局配分はノイズになるため、GRP感度の5%未満なら除外
  const grpSpan = rows.find((r) => r.id === "grp")?.span ?? 0;
  const filtered = rows.filter((row) => {
    if (row.id === "allocation" || row.id === "dropStation") {
      return impactSpan(row) >= Math.max(1, grpSpan * 0.05);
    }
    return true;
  });

  return filtered
    .sort((a, b) => b.span - a.span)
    .map(({ id, label, low, high }) => ({
      id,
      label,
      low,
      high,
      baseline: baseReach,
    }));
}

export function buildReachWaterfall(
  input: SimulationInput,
  baseline: SimulationResults,
  options: RunSimulationOptions = {},
): WaterfallRow[] {
  const currentReach = baseline.reachCount;
  const allDayReach = reachCountFor(
    {
      ...input,
      creativePattern: {
        presetName: "全日",
        blocks: getPresetBlocks("全日"),
      },
    },
    options,
  );

  const patternDelta = currentReach - allDayReach;

  const rows: WaterfallRow[] = [
    { name: "全日ベース", base: 0, delta: allDayReach, total: allDayReach },
    {
      name:
        input.creativePattern.presetName === "カスタム"
          ? "絵柄調整"
          : `絵柄（${input.creativePattern.presetName}）`,
      base: allDayReach,
      delta: patternDelta,
      total: currentReach,
    },
    {
      name: "現在プラン",
      base: 0,
      delta: currentReach,
      total: currentReach,
    },
  ];

  const optimalGrp = baseline.optimalGrp.minReachUnitPriceGrp ?? input.grp;
  if (optimalGrp !== input.grp) {
    const atOptimal = reachCountFor({ ...input, grp: optimalGrp }, options);
    rows.push({
      name: `GRP→${optimalGrp}（参考）`,
      base: currentReach,
      delta: atOptimal - currentReach,
      total: atOptimal,
    });
  }

  return rows;
}

export function detectLeverageInsights(
  input: SimulationInput,
  baseline: SimulationResults,
  tornado: TornadoRow[],
): LeverageInsight[] {
  const insights: LeverageInsight[] = [];
  if (tornado[0]) {
    insights.push({
      kind: "leverage",
      text: `影響最大の要因は「${tornado[0].label}」（差分 ${Math.round(Math.abs(tornado[0].high - tornado[0].low)).toLocaleString("ja-JP")}人）です。`,
    });
  }

  const minGrp = baseline.optimalGrp.minReachUnitPriceGrp;
  const minUnit = baseline.optimalGrp.minReachUnitPrice;
  if (minGrp != null && minUnit != null) {
    insights.push({
      kind: "leverage",
      text: `ターゲット最安リーチ単価は GRP ${minGrp}（${Math.round(minUnit).toLocaleString("ja-JP")}円/%）付近です。`,
    });
  }

  const alloc = tornado.find((r) => r.id === "allocation");
  if (alloc && Math.abs(alloc.high - alloc.low) > 0) {
    insights.push({
      kind: "leverage",
      text: `局へのGRP按分（均等↔コスト加重）でリーチが約 ${Math.round(Math.abs(alloc.high - alloc.low)).toLocaleString("ja-JP")}人変わります。安い局に厚く配分するコスト加重を試してください。`,
    });
  }

  const dropStation = tornado.find((r) => r.id === "dropStation");
  if (dropStation) {
    insights.push({
      kind: "bottleneck",
      text: `局選定の感度が高く、「${dropStation.label}」ではリーチが大きく落ちます。コア局の維持を優先してください。`,
    });
  }

  if (input.grp >= SENSITIVITY_GRP_THRESHOLD) {
    const marginal = tornado.find((r) => r.id === "grp");
    if (
      marginal &&
      Math.abs(marginal.high - marginal.low) < SENSITIVITY_GRP_DIMINISHING_DELTA
    ) {
      insights.push({
        kind: "bottleneck",
        text: "GRP帯が高く、追加GRPのリーチ寄与が逓減しています。絵柄・局・F閾値の見直しを優先してください。",
      });
    }
  }

  if (input.selectedStations.length <= 2) {
    insights.push({
      kind: "bottleneck",
      text: "出稿局が少ないため、エリア内リーチの天井が低くなっています。",
    });
  }

  if (input.coefficients.effectiveFrequency >= 6) {
    insights.push({
      kind: "bottleneck",
      text: "有効Fが高めのため、有効リーチの伸びが制限されています。",
    });
  }

  const tvCostPerThousand = baseline.costPerThousandReached;
  const webCostPerThousand = baseline.optimalGrp.webVideoCpmUsed * 1000;
  if (
    baseline.totalBudget > 0 &&
    webCostPerThousand > 0 &&
    Number.isFinite(tvCostPerThousand) &&
    tvCostPerThousand > webCostPerThousand
  ) {
    insights.push({
      kind: "bottleneck",
      text: `リーチ千人単価（${Math.round(tvCostPerThousand).toLocaleString("ja-JP")}円/千人）が web動画の千再生単価（${Math.round(webCostPerThousand).toLocaleString("ja-JP")}円/千再生）の約${(tvCostPerThousand / webCostPerThousand).toFixed(1)}倍です（方式A: web動画との効率比較と同じ見方）。`,
    });
  }

  return insights.slice(0, 6);
}

/**
 * Tornado上位要因・ボトルネック・最安GRPから、現状プランの改善方針を文章化する。
 */
export function buildImprovementStory(
  input: SimulationInput,
  baseline: SimulationResults,
  tornado: TornadoRow[],
  insights: LeverageInsight[],
  options: RunSimulationOptions = {},
): string {
  const current = baseline.reachCount;
  const lines: string[] = [];
  lines.push(
    `現状プランのリーチは約 ${Math.round(current).toLocaleString("ja-JP")}人（GRP ${Math.round(input.grp * 10) / 10}・${input.selectedStations.length}局・絵柄「${input.creativePattern.presetName}」）です。`,
  );

  const top = tornado.slice(0, 3);
  if (top.length > 0) {
    lines.push(
      `感度分析（Tornado）では、影響の大きい順に「${top.map((t) => t.label).join("」「")}」が効いています。`,
    );
  }

  const actions: string[] = [];
  const minGrp = baseline.optimalGrp.minReachUnitPriceGrp;
  if (minGrp != null && Math.abs(minGrp - input.grp) >= 1) {
    const atOpt = reachCountFor({ ...input, grp: minGrp }, options);
    const delta = atOpt - current;
    actions.push(
      `GRPを ${Math.round(minGrp * 10) / 10}（最安リーチ人数単価付近）へ寄せるとリーチは約 ${Math.round(atOpt).toLocaleString("ja-JP")}人（現状比 ${delta >= 0 ? "+" : ""}${Math.round(delta).toLocaleString("ja-JP")}人）の見通しです。`,
    );
  }

  // 局数・局選定のレバレッジを具体的に言及
  const allStations = listStationsForArea(input.area);
  const missing = allStations.filter((s) => !input.selectedStations.includes(s));
  if (missing.length > 0) {
    const gains: Array<{ station: string; reach: number; delta: number }> = [];
    for (const station of missing) {
      const nextStations = [...input.selectedStations, station];
      const reach = reachCountFor(
        { ...input, selectedStations: nextStations },
        options,
      );
      gains.push({ station, reach, delta: reach - current });
    }
    gains.sort((a, b) => b.delta - a.delta);
    const bestAdd = gains[0];
    if (bestAdd && bestAdd.delta > Math.max(1, current * 0.01)) {
      actions.push(
        `未選定の「${bestAdd.station}」を追加するとリーチは約 ${Math.round(bestAdd.reach).toLocaleString("ja-JP")}人（+${Math.round(bestAdd.delta).toLocaleString("ja-JP")}人）まで伸びる見込みです。`,
      );
    }
    const stationsRow = tornado.find((r) => r.id === "stations");
    if (stationsRow && stationsRow.high > current + 1) {
      actions.push(
        `選択を全局（${allStations.join("・")}）に広げると約 ${Math.round(stationsRow.high).toLocaleString("ja-JP")}人まで伸びる余地があります。`,
      );
    }
  }

  if (input.selectedStations.length >= 3) {
    const drops: Array<{ station: string; reach: number; delta: number }> = [];
    for (const station of input.selectedStations) {
      const reduced = input.selectedStations.filter((s) => s !== station);
      const reach = reachCountFor(
        { ...input, selectedStations: reduced },
        options,
      );
      drops.push({ station, reach, delta: current - reach });
    }
    drops.sort((a, b) => a.delta - b.delta); // 外しても落ちが小さい局が先
    const leastCritical = drops[0];
    const mostCritical = drops[drops.length - 1];
    if (mostCritical && mostCritical.delta > Math.max(1, current * 0.02)) {
      actions.push(
        `現状局のうち「${mostCritical.station}」を外すとリーチが約 ${Math.round(mostCritical.delta).toLocaleString("ja-JP")}人落ちるため維持を推奨します。`,
      );
    }
    if (
      leastCritical &&
      mostCritical &&
      leastCritical.station !== mostCritical.station &&
      leastCritical.delta < mostCritical.delta * 0.35
    ) {
      actions.push(
        `一方「${leastCritical.station}」は外しても落ちが約 ${Math.round(leastCritical.delta).toLocaleString("ja-JP")}人と相対的に小さく、予算制約時は削減候補になり得ます。`,
      );
    }
  }

  const alloc = tornado.find((r) => r.id === "allocation");
  if (alloc && alloc.high > current + 1) {
    actions.push(
      `局GRP按分をコスト加重（安い局に厚く）へ見直すと、リーチが最大で約 ${Math.round(alloc.high).toLocaleString("ja-JP")}人まで改善する可能性があります。`,
    );
  }

  const pattern = tornado.find((r) => r.id === "pattern");
  if (pattern) {
    actions.push(
      `絵柄の変更でリーチは約 ${Math.round(pattern.low).toLocaleString("ja-JP")}〜${Math.round(pattern.high).toLocaleString("ja-JP")}人の幅で動きます。到達重視なら高効率帯、コスト重視なら全日寄りの絵柄を比較してください。`,
    );
  }

  if (actions.length > 0) {
    lines.push(`リーチ最大化に向けた示唆: ${actions.join(" ")}`);
  }

  const bottlenecks = insights.filter((i) => i.kind === "bottleneck");
  if (bottlenecks.length > 0) {
    lines.push(
      `ボトルネック: ${bottlenecks.map((b) => b.text).join(" ")}`,
    );
  }

  if (baseline.webReplace && baseline.webReplace.replaceableBudget > 0) {
    lines.push(`補足: ${baseline.webReplace.message}`);
  }

  return lines.join("\n");
}

export function buildLeverageAnalysis(
  input: SimulationInput,
  baseline: SimulationResults,
  options: RunSimulationOptions = {},
): LeverageAnalysis {
  const tornado = runReachTornado(input, baseline, options);
  const insights = detectLeverageInsights(input, baseline, tornado);
  return {
    tornado,
    waterfall: buildReachWaterfall(input, baseline, options),
    insights,
    improvementStory: buildImprovementStory(
      input,
      baseline,
      tornado,
      insights,
      options,
    ),
  };
}
