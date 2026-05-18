"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpButton } from "@/components/ui/help-button";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { formatNumber, formatYen } from "@/lib/utils/number-format";

export function OptimalGrpPanel() {
  const results = useSimulationStore((s) => s.results);

  if (!results) {
    return null;
  }

  const { optimalGrp } = results;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>最効率 GRP の目安</CardTitle>
          <HelpButton termId="optimalGrp" />
        </div>
        <p className="text-sm text-slate-600">
          2方式を併記します。営業判断に応じて参照してください（現在の GRP 入力とは独立した提案値です）。
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-medium text-slate-500">
            方式A: webコストパリティ
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {optimalGrp.webParityGrp != null
              ? `GRP ${formatNumber(optimalGrp.webParityGrp)}`
              : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            リーチ単価 ≈ web動画 CPM {formatYen(optimalGrp.webVideoCpmUsed)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-medium text-slate-500">
            方式B: 限界効率法
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {optimalGrp.marginalEfficiencyGrp != null
              ? `GRP ${formatNumber(optimalGrp.marginalEfficiencyGrp)}`
              : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            限界リーチ効率が初期の50%まで低下するポイント
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
