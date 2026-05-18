"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StationReachRow } from "@/lib/engines/station-engine";

export function StationReachChart({ data }: { data: StationReachRow[] }) {
  const chartData = data.map((row) => ({
    station: row.station,
    reachPercent: row.reachRate * 100,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="station" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 12 }} unit="%" />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(2)}%`, "リーチ率"]}
          />
          <Bar dataKey="reachPercent" fill="#0f172a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
