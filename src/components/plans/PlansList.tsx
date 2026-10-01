"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recalculatePlanResults, usePlanStore } from "@/lib/stores/plan-store";
import {
  normalizeSimulationInput,
  useSimulationStore,
} from "@/lib/stores/simulation-store";
import { serializeSimulationCsv, sanitizeFilename } from "@/lib/io/export";
import type { SimulationResults } from "@/types/simulation";
import { downloadText } from "@/lib/utils/download";
import {
  formatPercent,
  formatYen,
} from "@/lib/utils/number-format";

export function PlansList() {
  const router = useRouter();
  const hydrate = usePlanStore((s) => s.hydrate);
  const loaded = usePlanStore((s) => s.loaded);
  const plans = usePlanStore((s) => s.plans);
  const removePlan = usePlanStore((s) => s.removePlan);
  const addToCompare = usePlanStore((s) => s.addToCompare);
  const loadInput = useSimulationStore((s) => s.loadInput);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // 保存時のresultsスナップショットではなく、現在のエンジンで再計算した値を表示する
  const recalculated = useMemo(() => {
    const map = new Map<string, SimulationResults | null>();
    for (const p of plans) {
      map.set(p.id, recalculatePlanResults(normalizeSimulationInput(p.input)));
    }
    return map;
  }, [plans]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return plans;
    }
    return plans.filter((p) => {
      const hay = [
        p.meta.name,
        p.meta.clientName,
        p.meta.projectName,
        p.meta.contactPerson,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [plans, query]);

  if (!loaded) {
    return <p className="text-sm text-slate-500">読み込み中…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="プラン名・企業名・案件名で検索"
          className="min-w-[240px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Link href="/simulate">
          <Button size="sm">新規シミュレーション</Button>
        </Link>
      </div>
      {message && (
        <p className="text-xs text-slate-600" role="status">
          {message}
        </p>
      )}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            保存済みプランがありません。シミュレーション画面で「プラン保存」してください。
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((plan) => {
            const current = recalculated.get(plan.id) ?? null;
            const shown = current ?? plan.results;
            const differs =
              current != null &&
              (Math.abs(current.reachRate - plan.results.reachRate) > 0.0005 ||
                Math.abs(current.totalBudget - plan.results.totalBudget) >= 1);
            return (
            <Card key={plan.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{plan.meta.name}</CardTitle>
                <p className="text-xs text-slate-500">
                  {plan.meta.clientName || "—"} / {plan.meta.projectName || "—"}
                </p>
                <p className="text-xs text-slate-400">
                  保存: {new Date(plan.savedAt).toLocaleString("ja-JP")}
                  {plan.meta.contactPerson ? ` · ${plan.meta.contactPerson}` : ""}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  リーチ {formatPercent(shown.reachRate * 100, 1)} ·{" "}
                  {formatYen(shown.totalBudget)}
                  {current != null && (
                    <span className="ml-1 text-[10px] text-slate-400">
                      （現在のエンジンで再計算）
                    </span>
                  )}
                </p>
                {differs && (
                  <p className="text-xs text-amber-700">
                    保存時: リーチ {formatPercent(plan.results.reachRate * 100, 1)} ·{" "}
                    {formatYen(plan.results.totalBudget)}
                    （エンジン更新により差異があります）
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  {plan.input.area} · GRP {plan.input.grp} ·{" "}
                  {plan.input.selectedStations.length}局
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      loadInput(plan.input);
                      router.push("/simulate");
                    }}
                  >
                    編集
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const res = await addToCompare(plan.id);
                      setMessage(
                        res.ok
                          ? "比較に追加しました"
                          : res.message ?? "比較に追加できませんでした",
                      );
                    }}
                  >
                    比較
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const csv = serializeSimulationCsv(
                        plan.input,
                        shown,
                        { planName: plan.meta.name },
                      );
                      downloadText(
                        csv,
                        `${sanitizeFilename(plan.meta.name)}.csv`,
                        "text/csv;charset=utf-8",
                      );
                    }}
                  >
                    CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void removePlan(plan.id)}
                  >
                    削除
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
