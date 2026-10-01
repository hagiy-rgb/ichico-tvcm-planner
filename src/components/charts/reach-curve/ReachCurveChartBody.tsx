"use client";

import { useId, useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartExportButtons } from "@/components/charts/ChartExportButtons";
import { ChartShell } from "@/components/charts/ChartShell";
import {
  CHART_GRID_PROPS,
  CHART_SERIES_COLORS,
  csvEscape,
} from "@/components/charts/shared/chart-utils";
import {
  findMinReachUnitPricePoint,
  reachCurveGrpMax,
  reachUnitPriceYDomain,
} from "@/lib/engines/reach-curve-chart-utils";
import {
  formatGrp,
  formatNumber,
  formatPersonUnitPrice,
  formatYen,
} from "@/lib/utils/number-format";
import type { ReachCurvePoint } from "@/types/simulation";

export type ReachYAxisMode = "rate" | "count";
export type ReachXAxisMode = "grp" | "budget";

export type CurveSeries = {
  target: string;
  points: ReachCurvePoint[];
};

function collectPersonUnitPrices(points: ReachCurvePoint[]): number[] {
  return points
    .filter((p) => p.grp > 0)
    .map((p) => p.reachPersonUnitPrice)
    .filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
}

function findMinPersonUnitPricePoint(
  series: Array<{ target: string; points: ReachCurvePoint[] }>,
): { target: string; grp: number; reachPersonUnitPrice: number } | null {
  let best: { target: string; grp: number; reachPersonUnitPrice: number } | null =
    null;
  for (const s of series) {
    for (const p of s.points) {
      if (p.grp <= 0) continue;
      const price = p.reachPersonUnitPrice;
      if (price == null || !Number.isFinite(price) || price <= 0) continue;
      if (!best || price < best.reachPersonUnitPrice) {
        best = {
          target: s.target,
          grp: p.grp,
          reachPersonUnitPrice: price,
        };
      }
    }
  }
  return best;
}

export function ReachCurveChartBody({
  series,
  yAxisMode,
  xAxisMode,
  showUnitPrice,
  perCost,
  inputGrp,
  chartHeight,
  periodSummary,
  webReplaceKeepGrp,
}: {
  series: CurveSeries[];
  yAxisMode: ReachYAxisMode;
  xAxisMode: ReachXAxisMode;
  showUnitPrice: boolean;
  perCost: number;
  inputGrp?: number;
  chartHeight?: number;
  periodSummary?: (grp: number) => string | null;
  webReplaceKeepGrp?: number | null;
}) {
  const chartId = useId().replace(/:/g, "");
  const maxXGrp =
    inputGrp != null
      ? reachCurveGrpMax(inputGrp)
      : Math.max(0, ...series.flatMap((s) => s.points.map((p) => p.grp)));
  const maxXBudget = maxXGrp * perCost;

  const chartData = useMemo(() => {
    if (series.length === 0) return [];
    const grps = series[0].points
      .map((p) => p.grp)
      .filter((grp) => grp <= maxXGrp);
    return grps.map((grp, idx) => {
      const row: Record<string, number> = {
        grp,
        budget: grp * perCost,
      };
      series.forEach((s, seriesIndex) => {
        const point = s.points.find((p) => p.grp === grp) ?? s.points[idx];
        if (!point) return;
        row[`reach_${seriesIndex}`] =
          yAxisMode === "rate" ? point.reachRate * 100 : point.reachCount;
        const personPrice = point.reachPersonUnitPrice;
        row[`unit_${seriesIndex}`] =
          point.grp > 0 &&
          personPrice != null &&
          Number.isFinite(personPrice) &&
          personPrice > 0
            ? personPrice
            : (null as unknown as number);
      });
      return row;
    });
  }, [maxXGrp, perCost, series, yAxisMode]);

  const reachValues = series.flatMap((s) =>
    s.points
      .filter((p) => p.grp <= maxXGrp)
      .map((p) => (yAxisMode === "rate" ? p.reachRate * 100 : p.reachCount)),
  );
  const maxReach = Math.max(0, ...reachValues);
  const unitValues = series.flatMap((s) =>
    collectPersonUnitPrices(
      s.points.filter(
        (p) => p.grp <= maxXGrp && p.grp >= Math.max(50, maxXGrp * 0.05),
      ),
    ),
  );
  const unitDomain = reachUnitPriceYDomain(unitValues);
  const minUnitPoint = showUnitPrice
    ? findMinPersonUnitPricePoint(
        series.map((s) => ({
          target: s.target,
          points: s.points.filter((p) => p.grp <= maxXGrp),
        })),
      )
    : null;
  // keep util import used for compile if needed elsewhere
  void findMinReachUnitPricePoint;

  const reachYMax = Math.ceil(maxReach * 1.08) || 10;
  const reachAxisLabel = yAxisMode === "rate" ? "リーチ率（%）" : "リーチ人数（人）";
  const xAxisKey = xAxisMode === "grp" ? "grp" : "budget";
  const xAxisLabel = xAxisMode === "grp" ? "GRP" : "出稿金額";
  const leftMargin = yAxisMode === "count" ? 88 : 64;
  const rightMargin = showUnitPrice ? 72 : 24;

  const csv = useMemo(() => {
    const rows = [
      [
        "target",
        "grp",
        "budget",
        "reachRatePercent",
        "reachCount",
        "reachPersonUnitPriceYen",
        "reachUnitPriceYenPerPercent",
      ],
    ];
    for (const s of series) {
      for (const p of s.points) {
        rows.push([
          s.target,
          String(p.grp),
          String(Math.round(p.grp * perCost)),
          String(p.reachRate * 100),
          String(p.reachCount),
          String(p.reachPersonUnitPrice ?? ""),
          String(p.reachUnitPrice ?? ""),
        ]);
      }
    }
    return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  }, [perCost, series]);

  if (chartData.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        リーチカーブを表示できません。エリア・放送局・GRPを確認してください。
      </p>
    );
  }

  const replaceX =
    webReplaceKeepGrp != null
      ? xAxisMode === "budget"
        ? webReplaceKeepGrp * perCost
        : webReplaceKeepGrp
      : null;

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ChartExportButtons
          elementId={chartId}
          filename="reach_curve"
          csv={csv}
        />
      </div>
      <div id={chartId}>
        <ChartShell height={chartHeight}>
          <LineChart
            data={chartData}
            margin={{
              top: 32,
              right: rightMargin,
              left: leftMargin,
              bottom: 20,
            }}
          >
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis
              type="number"
              dataKey={xAxisKey}
              domain={
                xAxisMode === "grp" ? [0, maxXGrp] : [0, maxXBudget]
              }
              tick={{ fontSize: 11 }}
              tickFormatter={(v) =>
                xAxisMode === "budget" ? formatYen(v) : formatGrp(v)
              }
              label={{
                value: xAxisLabel,
                position: "insideBottom",
                offset: -2,
                style: { fill: "#64748b", fontSize: 11 },
              }}
            />
            <YAxis
              yAxisId="reach"
              width={yAxisMode === "count" ? 78 : 52}
              domain={[0, reachYMax]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) =>
                yAxisMode === "count" ? formatNumber(v) : String(v)
              }
              label={{
                value: reachAxisLabel,
                angle: -90,
                position: "left",
                offset: 12,
                dx: -10,
                style: { textAnchor: "middle", fill: "#475569", fontSize: 11 },
              }}
            />
            {showUnitPrice ? (
              <YAxis
                yAxisId="unit"
                orientation="right"
                width={64}
                domain={unitDomain}
                allowDataOverflow
                tick={{ fontSize: 11 }}
                tickFormatter={(v) =>
                  v >= 100 ? String(Math.round(v)) : v.toFixed(1)
                }
                label={{
                  value: "リーチ人数単価（円/人）",
                  angle: 90,
                  position: "right",
                  offset: 16,
                  dx: 10,
                  style: {
                    textAnchor: "middle",
                    fill: "#475569",
                    fontSize: 11,
                  },
                }}
              />
            ) : null}
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name.includes("人数単価") || name.includes("リーチ単価")) {
                  return [formatPersonUnitPrice(value), name];
                }
                if (yAxisMode === "rate") {
                  return [`${value.toFixed(2)}%`, name];
                }
                return [`${formatNumber(Math.round(value))}人`, name];
              }}
              labelFormatter={(value) => {
                const x = Number(value);
                const head =
                  xAxisMode === "budget"
                    ? `出稿金額 ${formatYen(x)}`
                    : `GRP ${formatGrp(x)}`;
                const grp =
                  xAxisMode === "budget" ? (perCost > 0 ? x / perCost : 0) : x;
                const summary = periodSummary?.(grp);
                return summary ? `${head}｜期間配分 ${summary}` : head;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {replaceX != null &&
            inputGrp != null &&
            replaceX <
              (xAxisMode === "budget" ? inputGrp * perCost : inputGrp) ? (
              <ReferenceLine
                yAxisId="reach"
                x={replaceX}
                stroke="#dc2626"
                strokeDasharray="4 4"
                label={{
                  value: "リプレイス帯→",
                  position: "insideTopLeft",
                  fill: "#dc2626",
                  fontSize: 11,
                }}
              />
            ) : null}
            {showUnitPrice && minUnitPoint ? (
              <ReferenceDot
                yAxisId="unit"
                x={
                  xAxisMode === "budget"
                    ? minUnitPoint.grp * perCost
                    : minUnitPoint.grp
                }
                y={minUnitPoint.reachPersonUnitPrice}
                r={5}
                fill="#dc2626"
                stroke="#fff"
                strokeWidth={2}
                label={{
                  value: `最安 ${formatPersonUnitPrice(minUnitPoint.reachPersonUnitPrice)}/人 @ GRP ${formatGrp(minUnitPoint.grp)}`,
                  position: "top",
                  fill: "#dc2626",
                  fontSize: 11,
                }}
              />
            ) : null}
            {series.flatMap((s, i) => {
              const color = CHART_SERIES_COLORS[i % CHART_SERIES_COLORS.length];
              const reachLabel =
                yAxisMode === "rate"
                  ? `${s.target} リーチ率`
                  : `${s.target} リーチ人数`;
              return [
                <Line
                  key={`${s.target}-reach`}
                  yAxisId="reach"
                  type="monotone"
                  dataKey={`reach_${i}`}
                  name={reachLabel}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  isAnimationActive={false}
                />,
                showUnitPrice ? (
                  <Line
                    key={`${s.target}-unit`}
                    yAxisId="unit"
                    type="monotone"
                    dataKey={`unit_${i}`}
                    name={`${s.target} リーチ人数単価`}
                    stroke={color}
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                ) : null,
              ];
            })}
          </LineChart>
        </ChartShell>
      </div>
    </div>
  );
}
