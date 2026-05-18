"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReachCurvePoint } from "@/types/simulation";

export function ReachCurveChart({ data }: { data: ReachCurvePoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="grp"
            tick={{ fontSize: 12 }}
            label={{ value: "GRP", position: "insideBottom", offset: -4 }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            unit="%"
            label={{ value: "リーチ率", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === "reachRate") {
                return [`${value.toFixed(2)}%`, "リーチ率"];
              }
              return [value, name];
            }}
            labelFormatter={(grp) => `GRP ${grp}`}
          />
          <Line
            type="monotone"
            dataKey="reachRate"
            stroke="#0f172a"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
