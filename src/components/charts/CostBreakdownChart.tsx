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

type CostBar = {
  name: string;
  amount: number;
};

export function CostBreakdownChart({
  totalBudget,
  reachCount,
  cpm,
}: {
  totalBudget: number;
  reachCount: number;
  cpm: number;
}) {
  const costPerReach =
    reachCount > 0 ? Math.round(totalBudget / reachCount) : 0;

  const data: CostBar[] = [
    { name: "出稿総額", amount: totalBudget },
    { name: "リーチ1人あたり", amount: costPerReach },
    { name: "CPM（千円）", amount: Math.round(cpm) },
  ];

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number) => [
              `¥${value.toLocaleString("ja-JP")}`,
              "金額",
            ]}
          />
          <Bar dataKey="amount" fill="#334155" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
