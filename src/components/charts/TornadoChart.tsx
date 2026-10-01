"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartShell } from "@/components/charts/ChartShell";
import { CHART_GRID_PROPS } from "@/components/charts/shared/chart-utils";
import type { TornadoRow } from "@/lib/engines/sensitivity-engine";
import { formatNumber } from "@/lib/utils/number-format";

type ChartRow = {
  label: string;
  offset: number;
  span: number;
  low: number;
  high: number;
};

// recharts の Label content には Cartesian/Polar 双方の viewBox 型が渡り得るため、
// unknown で受けて Cartesian 座標として解釈する
type BaselineLabelProps = {
  viewBox?: unknown;
  value?: string | number;
};

function BaselineLabel({ viewBox, value }: BaselineLabelProps) {
  const vb = (viewBox ?? {}) as { x?: number; y?: number; height?: number };
  const x = vb.x ?? 0;
  const chartBottom = (vb.y ?? 0) + (vb.height ?? 0);
  const text = String(value ?? "");
  const width = Math.max(text.length * 6.5 + 16, 72);

  return (
    <g>
      <rect
        x={x - width / 2}
        y={chartBottom + 4}
        width={width}
        height={18}
        fill="#ffffff"
        fillOpacity={0.97}
        stroke="#ef4444"
        strokeWidth={1}
        rx={4}
      />
      <text
        x={x}
        y={chartBottom + 16}
        textAnchor="middle"
        fill="#ef4444"
        fontSize={11}
        fontWeight={700}
      >
        {text}
      </text>
    </g>
  );
}

export function TornadoChart({ data }: { data: TornadoRow[] }) {
  const baseline = data[0]?.baseline ?? 0;
  const chartData: ChartRow[] = data.map((row) => ({
    label: row.label,
    offset: row.low,
    span: Math.max(0, row.high - row.low),
    low: row.low,
    high: row.high,
  }));

  if (chartData.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        感度分析データがありません。
      </p>
    );
  }

  const xMin = Math.min(...chartData.map((d) => d.low), baseline);
  const xMax = Math.max(...chartData.map((d) => d.high), baseline);
  const xPad = Math.max((xMax - xMin) * 0.08, 1);
  const xDomain: [number, number] = [xMin - xPad, xMax + xPad];
  const baselineText = `現状 ${formatNumber(Math.round(baseline))}人`;

  return (
    <div className="space-y-2">
      <p className="text-center text-xs font-semibold text-red-600">
        {baselineText}
        <span className="ml-1 font-normal text-slate-500">（赤い破線）</span>
      </p>
      <ChartShell>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 8, right: 24, left: 8, bottom: 32 }}
        >
          <CartesianGrid {...CHART_GRID_PROPS} />
          <XAxis
            type="number"
            domain={xDomain}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => formatNumber(v)}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={88}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === "span") return [`${formatNumber(Math.round(value))}人`, "レンジ幅"];
              return [`${formatNumber(Math.round(value))}人`, name];
            }}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as ChartRow | undefined;
              if (!row) return "";
              return `${row.label}: ${formatNumber(Math.round(row.low))}人 〜 ${formatNumber(Math.round(row.high))}人（現状 ${formatNumber(Math.round(baseline))}人）`;
            }}
          />
          <ReferenceLine
            x={baseline}
            ifOverflow="extendDomain"
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="4 4"
            label={{
              value: baselineText,
              position: "bottom",
              content: BaselineLabel,
            }}
          />
          <Bar dataKey="offset" stackId="range" fill="transparent" />
          <Bar dataKey="span" stackId="range" fill="#0369a1" radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => (
              <Cell key={`span-${i}`} fill="#0369a1" />
            ))}
          </Bar>
        </BarChart>
      </ChartShell>
    </div>
  );
}
