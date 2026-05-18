"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReachCurveChart } from "@/components/charts/ReachCurveChart";
import { usePlanStore } from "@/lib/stores/plan-store";
import type { SavedPlanRecord } from "@/types/plan";
import {
  formatNumber,
  formatPercent,
  formatYen,
} from "@/lib/utils/number-format";
import { serializeSimulationCsv, sanitizeFilename } from "@/lib/io/export";
import { downloadText } from "@/lib/utils/download";

function ComparePlanColumn({
  plan,
  onRemove,
}: {
  plan: SavedPlanRecord;
  onRemove: () => void;
}) {
  const { results, input, meta } = plan;

  const handleCsv = () => {
    const csv = serializeSimulationCsv(input, results, { planName: meta.name });
    downloadText(
      csv,
      `${sanitizeFilename(meta.name)}.csv`,
      "text/csv;charset=utf-8",
    );
  };

  return (
    <Card className="min-w-[240px] flex-1">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-base">{meta.name}</CardTitle>
        <p className="text-xs text-slate-500">
          {meta.clientName || "—"} / {meta.projectName || "—"}
        </p>
        <p className="text-xs text-slate-400">
          {input.area} · GRP {input.grp} · {input.campaignWeeks}週
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <dt className="text-slate-500">リーチ率</dt>
          <dd className="font-semibold">{formatPercent(results.reachRate * 100, 2)}</dd>
          <dt className="text-slate-500">認知率</dt>
          <dd className="font-semibold">{formatPercent(results.awarenessRate, 2)}</dd>
          <dt className="text-slate-500">予算</dt>
          <dd className="font-semibold">{formatYen(results.totalBudget)}</dd>
          <dt className="text-slate-500">CPM</dt>
          <dd>{formatYen(results.cpm)}</dd>
          <dt className="text-slate-500">リーチ単価</dt>
          <dd>
            {Number.isFinite(results.reachUnitPrice)
              ? formatYen(results.reachUnitPrice)
              : "—"}
          </dd>
          <dt className="text-slate-500">リーチ人数</dt>
          <dd>{formatNumber(results.reachCount)}人</dd>
        </dl>
        <div className="h-40">
          <ReachCurveChart data={results.reachCurve} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleCsv}>
            CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove}>
            比較から外す
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CompareWorkspace() {
  const hydrate = usePlanStore((s) => s.hydrate);
  const loaded = usePlanStore((s) => s.loaded);
  const plans = usePlanStore((s) => s.plans);
  const compareIds = usePlanStore((s) => s.compareIds);
  const removeFromCompare = usePlanStore((s) => s.removeFromCompare);
  const clearCompare = usePlanStore((s) => s.clearCompare);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const comparePlans = useMemo(
    () =>
      compareIds
        .map((id) => plans.find((p) => p.id === id))
        .filter((p): p is SavedPlanRecord => Boolean(p)),
    [compareIds, plans],
  );

  if (!loaded) {
    return <p className="text-sm text-slate-500">読み込み中…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          最大4プランまで横並びで比較できます。シミュレーション画面の「比較に追加」でキューに入れます。
        </p>
        <div className="flex gap-2">
          <Link href="/simulate">
            <Button size="sm" variant="outline">
              シミュレーションへ
            </Button>
          </Link>
          {comparePlans.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => void clearCompare()}>
              比較をクリア
            </Button>
          )}
        </div>
      </div>

      {comparePlans.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            比較対象がありません。シミュレーション結果から「比較に追加」してください。
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:overflow-x-auto">
          {comparePlans.map((plan) => (
            <ComparePlanColumn
              key={plan.id}
              plan={plan}
              onRemove={() => void removeFromCompare(plan.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
