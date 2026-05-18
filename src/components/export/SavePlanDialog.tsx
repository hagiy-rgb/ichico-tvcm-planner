"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { snapshotCurrentPlan, usePlanStore } from "@/lib/stores/plan-store";
import type { SavedPlanMeta, SavedPlanRecord } from "@/types/plan";

type SavePlanDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (planId: string, destination: "local" | "drive") => void;
};

const emptyMeta: SavedPlanMeta = {
  name: "",
  clientName: "",
  projectName: "",
  contactPerson: "",
  memo: "",
};

export function SavePlanDialog({ open, onClose, onSaved }: SavePlanDialogProps) {
  const { data: session } = useSession();
  const input = useSimulationStore((s) => s.input);
  const results = useSimulationStore((s) => s.results);
  const savePlan = usePlanStore((s) => s.savePlan);
  const [meta, setMeta] = useState<SavedPlanMeta>(emptyMeta);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) {
    return null;
  }

  const buildSnapshot = () => snapshotCurrentPlan(meta, input, results);

  const handleSaveLocal = async () => {
    const snapshot = buildSnapshot();
    if (!snapshot) {
      setError("計算結果がありません");
      return;
    }
    if (!snapshot.meta.name) {
      setError("プラン名を入力してください");
      return;
    }
    setSaving(true);
    try {
      const id = await savePlan(snapshot.meta, snapshot.input, snapshot.results);
      setMeta(emptyMeta);
      setError(null);
      onSaved(id, "local");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDrive = async () => {
    const snapshot = buildSnapshot();
    if (!snapshot) {
      setError("計算結果がありません");
      return;
    }
    if (!snapshot.meta.name) {
      setError("プラン名を入力してください");
      return;
    }
    if (!session) {
      setError("Google Driveに保存するにはログインが必要です");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const id = await savePlan(snapshot.meta, snapshot.input, snapshot.results);
      const plan: SavedPlanRecord = {
        id,
        meta: snapshot.meta,
        savedAt: new Date().toISOString(),
        input: snapshot.input,
        results: snapshot.results,
      };

      const res = await fetch("/api/drive/save-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Driveへの保存に失敗しました");
      }

      setMeta(emptyMeta);
      onSaved(id, "drive");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Driveへの保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-plan-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 id="save-plan-title" className="text-lg font-semibold text-slate-900">
          プラン保存
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          ローカル（IndexedDB）または Google Drive（企業/案件/プランの階層）に保存できます。
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-slate-700">
            プラン名 *
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={meta.name}
              onChange={(e) => setMeta({ ...meta, name: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            企業名
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={meta.clientName}
              onChange={(e) => setMeta({ ...meta, clientName: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            案件名
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={meta.projectName}
              onChange={(e) => setMeta({ ...meta, projectName: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            担当者
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={meta.contactPerson}
              onChange={(e) =>
                setMeta({ ...meta, contactPerson: e.target.value })
              }
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            メモ
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              rows={2}
              value={meta.memo}
              onChange={(e) => setMeta({ ...meta, memo: e.target.value })}
            />
          </label>
        </div>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            キャンセル
          </Button>
          <Button size="sm" variant="outline" onClick={handleSaveLocal} disabled={saving}>
            ローカル保存
          </Button>
          <Button size="sm" onClick={handleSaveDrive} disabled={saving || !session}>
            Google Driveに保存
          </Button>
        </div>
        {!session && (
          <p className="mt-2 text-xs text-amber-700">
            Drive保存にはヘッダーの「Googleでログイン」が必要です。
          </p>
        )}
      </div>
    </div>
  );
}
