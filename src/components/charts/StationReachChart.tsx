"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartShell } from "@/components/charts/ChartShell";
import { CHART_GRID_PROPS } from "@/components/charts/shared/chart-utils";
import type { StationReachRow } from "@/lib/engines/station-engine";
import { formatNumber } from "@/lib/utils/number-format";

export function StationReachChart({ data }: { data: StationReachRow[] }) {
  const [axisMode, setAxisMode] = useState<"rate" | "count">("rate");
  const chartData = data.map((row) => ({
    station: row.station,
    reachPercent: row.reachRate * 100,
    reachCount: row.reachCount,
    grpSharePercent: (row.grpShare ?? 0) * 100,
  }));

  if (chartData.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        局別リーチデータがありません。
      </p>
    );
  }

  const dataKey = axisMode === "rate" ? "reachPercent" : "reachCount";
  const axisLabel = axisMode === "rate" ? "リーチ率（%）" : "リーチ人数（人）";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-700">タテ軸</span>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 transition-colors ${
              axisMode === "rate"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
            onClick={() => setAxisMode("rate")}
          >
            リーチ率
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 transition-colors ${
              axisMode === "count"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
            onClick={() => setAxisMode("count")}
          >
            リーチ人数
          </button>
        </div>
      </div>
      <ChartShell>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid {...CHART_GRID_PROPS} />
          <XAxis dataKey="station" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            unit={axisMode === "rate" ? "%" : ""}
            tickFormatter={(v) =>
              axisMode === "count" ? formatNumber(v) : String(v)
            }
            label={{
              value: axisLabel,
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip
            formatter={(value: number) =>
              axisMode === "rate"
                ? [`${value.toFixed(2)}%`, "リーチ率"]
                : [`${formatNumber(Math.round(value))}人`, "リーチ人数"]
            }
            labelFormatter={(station, payload) => {
              const share = payload?.[0]?.payload?.grpSharePercent;
              return typeof share === "number"
                ? `${station}（GRP配分 ${share.toFixed(1)}%）`
                : String(station);
            }}
          />
          <Bar dataKey={dataKey} fill="#0f172a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartShell>
    </div>
  );
}
