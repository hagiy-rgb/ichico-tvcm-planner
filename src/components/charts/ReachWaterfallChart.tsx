"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartShell } from "@/components/charts/ChartShell";
import { CHART_GRID_PROPS } from "@/components/charts/shared/chart-utils";
import type { WaterfallRow } from "@/lib/engines/sensitivity-engine";
import { formatNumber } from "@/lib/utils/number-format";

export function ReachWaterfallChart({ data }: { data: WaterfallRow[] }) {
  const chartData = data.map((row) => ({
    name: row.name,
    base: row.base,
    delta: row.delta,
    total: row.total,
    fill: row.delta >= 0 ? "#34d399" : "#f87171",
  }));

  if (chartData.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        ウォーターフォールデータがありません。
      </p>
    );
  }

  return (
    <ChartShell>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid {...CHART_GRID_PROPS} />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={56} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => formatNumber(v)}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === "base") return [`${formatNumber(Math.round(value))}人`, "積み上げ基準"];
            if (name === "delta") return [`${formatNumber(Math.round(value))}人`, "増減"];
            return [`${formatNumber(Math.round(value))}人`, "累計"];
          }}
        />
        <Bar dataKey="base" stackId="wf" fill="transparent" />
        <Bar dataKey="delta" stackId="wf" radius={[4, 4, 0, 0]}>
          {chartData.map((row, i) => (
            <Cell key={`wf-${i}`} fill={row.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartShell>
  );
}
