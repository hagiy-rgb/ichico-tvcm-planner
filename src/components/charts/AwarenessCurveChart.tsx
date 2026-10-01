"use client";

import { useId, useMemo } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartExportButtons } from "@/components/charts/ChartExportButtons";
import { ChartShell } from "@/components/charts/ChartShell";
import {
  CHART_GRID_PROPS,
  csvEscape,
} from "@/components/charts/shared/chart-utils";
import type { AwarenessCurvePoint } from "@/lib/engines/awareness-engine";
import type { PlanningGranularity } from "@/lib/engines/grp-schedule";

export function AwarenessCurveChart({
  data,
  granularity = "week",
}: {
  data: AwarenessCurvePoint[];
  granularity?: PlanningGranularity;
}) {
  const chartId = useId().replace(/:/g, "");
  const unit = granularity === "month" ? "月" : "週";
  const csv = useMemo(() => {
    const rows = [
      [
        "period",
        "periodLabel",
        "grp",
        "effectiveGrp",
        "adstock",
        "awarenessRatePercent",
      ],
    ];
    for (const point of data ?? []) {
      rows.push([
        String(point.period),
        point.periodLabel,
        String(point.grp),
        String(point.effectiveGrp),
        String(point.adstock),
        String(point.awarenessRate),
      ]);
    }
    return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  }, [data]);

  if (!data?.length) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        認知率推移データがありません。
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ChartExportButtons
          elementId={chartId}
          filename="awareness_curve"
          csv={csv}
        />
      </div>
      <div id={chartId}>
      <ChartShell>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          <CartesianGrid {...CHART_GRID_PROPS} />
          <XAxis
            dataKey="periodLabel"
            tick={{ fontSize: 11 }}
            minTickGap={8}
            label={{ value: unit, position: "insideBottom", offset: -4 }}
          />
          <YAxis
            yAxisId="awareness"
            tick={{ fontSize: 12 }}
            unit="%"
            label={{
              value: "認知率（%）",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <YAxis
            yAxisId="grp"
            orientation="right"
            tick={{ fontSize: 12 }}
            label={{
              value: "GRP",
              angle: 90,
              position: "insideRight",
            }}
          />
          <Tooltip
            formatter={(value: number, name: string, item) => {
              if (item?.dataKey === "awarenessRate") {
                return [`${value.toFixed(2)}%`, "認知率（%）"];
              }
              if (item?.dataKey === "grp") {
                return [value.toFixed(1), `GRP（${unit}の投下量）`];
              }
              return [value, name];
            }}
            labelFormatter={(label) => String(label)}
          />
          <Legend />
          <Area
            yAxisId="awareness"
            type="monotone"
            dataKey="awarenessRate"
            name="認知率（%）"
            stroke="#0369a1"
            strokeWidth={2}
            fill="#0369a1"
            fillOpacity={0.18}
            dot={{ r: 2, fill: "#0369a1", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
          <Bar
            yAxisId="grp"
            dataKey="grp"
            name="GRP"
            fill="#64748b"
            opacity={0.55}
            maxBarSize={20}
            radius={[2, 2, 0, 0]}
          />
        </ComposedChart>
      </ChartShell>
      </div>
    </div>
  );
}
