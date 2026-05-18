"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { normalizeSimulationInput } from "@/lib/stores/simulation-store";
import type { DriveIndex, DriveIndexEntry } from "@/types/drive";
import {
  formatPercent,
  formatYen,
} from "@/lib/utils/number-format";
import type { SavedPlanRecord } from "@/types/plan";
import { putSavedPlan } from "@/lib/db/app-db";

export function DrivePlansPanel() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const loadInput = useSimulationStore((s) => s.loadInput);
  const [index, setIndex] = useState<DriveIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPlans = useCallback(async () => {
    if (!session) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/drive/plans");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "読み込みに失敗しました");
      }
      setIndex(data as DriveIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      void fetchPlans();
    }
  }, [session, fetchPlans]);

  const handleOpen = async (entry: DriveIndexEntry) => {
    try {
      const res = await fetch(
        `/api/drive/load-plan?fileId=${encodeURIComponent(entry.driveFileId)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "プランの取得に失敗しました");
      }
      const plan = data as SavedPlanRecord;
      await putSavedPlan(plan);
      loadInput(normalizeSimulationInput(plan.input));
      router.push("/simulate");
    } catch (err) {
      setError(err instanceof Error ? err.message : "プランの取得に失敗しました");
    }
  };

  if (status !== "authenticated") {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base">Google Drive プラン</CardTitle>
          <p className="text-xs text-slate-500">
            フォルダ: ICHICO_TV_Planner（drive.file スコープ）
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void fetchPlans()} disabled={loading}>
          更新
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {loading && <p className="text-xs text-slate-400">読み込み中…</p>}
        {error && <p className="text-xs text-rose-600">{error}</p>}
        {index && index.plans.length === 0 && !loading && (
          <p className="text-xs text-slate-500">
            Drive上に保存済みプランがありません。シミュレーション画面から「Driveに保存」してください。
          </p>
        )}
        {index && index.plans.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {index.plans.map((entry) => (
              <div
                key={entry.driveFileId}
                className="rounded-lg border border-slate-200 p-3"
              >
                <p className="font-medium">{entry.name}</p>
                <p className="text-xs text-slate-500">
                  {entry.clientName || "—"} / {entry.projectName || "—"}
                </p>
                <p className="mt-1 text-xs">
                  リーチ {formatPercent(entry.reachRate * 100, 1)} ·{" "}
                  {formatYen(entry.totalBudget)}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => void handleOpen(entry)}
                >
                  開く
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
