"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AwarenessCurvePoint } from "@/lib/engines/awareness-engine";

export function AwarenessCurveChart({ data }: { data: AwarenessCurvePoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 12 }}
            label={{ value: "週", position: "insideBottom", offset: -4 }}
          />
          <YAxis
            yAxisId="awareness"
            tick={{ fontSize: 12 }}
            unit="%"
            label={{
              value: "認知率",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <YAxis
            yAxisId="adstock"
            orientation="right"
            tick={{ fontSize: 12 }}
            label={{
              value: "Adstock",
              angle: 90,
              position: "insideRight",
            }}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === "awarenessRate") {
                return [`${value.toFixed(2)}%`, "認知率"];
              }
              if (name === "adstock") {
                return [value.toFixed(1), "Adstock"];
              }
              if (name === "grp") {
                return [value.toFixed(1), "週GRP"];
              }
              return [value, name];
            }}
            labelFormatter={(week) => `第${week}週`}
          />
          <Legend />
          <Line
            yAxisId="awareness"
            type="monotone"
            dataKey="awarenessRate"
            name="認知率"
            stroke="#0369a1"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            yAxisId="adstock"
            type="monotone"
            dataKey="adstock"
            name="Adstock"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
