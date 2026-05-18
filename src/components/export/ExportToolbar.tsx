"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SavePlanDialog } from "./SavePlanDialog";
import { serializeSimulationCsv, sanitizeFilename } from "@/lib/io/export";
import { exportElementToPng } from "@/lib/io/image-export";
import { parseSimulationCsvToInput } from "@/lib/io/csv-import";
import { downloadText } from "@/lib/utils/download";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { usePlanStore, snapshotCurrentPlan } from "@/lib/stores/plan-store";

type ExportToolbarProps = {
  exportRootId: string;
};

export function ExportToolbar({ exportRootId }: ExportToolbarProps) {
  const input = useSimulationStore((s) => s.input);
  const results = useSimulationStore((s) => s.results);
  const loadInput = useSimulationStore((s) => s.loadInput);
  const savePlan = usePlanStore((s) => s.savePlan);
  const addToCompare = usePlanStore((s) => s.addToCompare);

  const [saveOpen, setSaveOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCsvExport = () => {
    if (!results) {
      return;
    }
    const csv = serializeSimulationCsv(input, results);
    const name = sanitizeFilename(`${input.area}_GRP${input.grp}`);
    downloadText(csv, `${name}.csv`, "text/csv;charset=utf-8");
  };

  const handlePngExport = async () => {
    const el = document.getElementById(exportRootId);
    if (!el) {
      setMessage("出力対象が見つかりません");
      return;
    }
    try {
      await exportElementToPng(el, `${input.area}_GRP${input.grp}`);
    } catch {
      setMessage("PNGの生成に失敗しました");
    }
  };

  const handleAddToCompare = async () => {
    const snapshot = snapshotCurrentPlan({ name: "" }, input, results);
    if (!snapshot) {
      setMessage("計算結果がありません");
      return;
    }
    const id = await savePlan(snapshot.meta, snapshot.input, snapshot.results);
    const res = await addToCompare(id);
    if (res.ok) {
      setMessage("比較キューに追加しました（/compare で確認）");
    } else {
      setMessage(res.message ?? "比較に追加できませんでした");
    }
  };

  const handleCsvImport = async (file: File) => {
    try {
      const text = await file.text();
      const restored = parseSimulationCsvToInput(text);
      loadInput(restored);
      setMessage("CSVから条件を読み込み、再計算しました");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "CSVの読み込みに失敗しました";
      setMessage(msg);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setSaveOpen(true)} disabled={!results}>
          プラン保存
        </Button>
        <Button size="sm" variant="outline" onClick={handleAddToCompare} disabled={!results}>
          比較に追加
        </Button>
        <Button size="sm" variant="outline" onClick={handleCsvExport} disabled={!results}>
          CSV出力
        </Button>
        <Button size="sm" variant="outline" onClick={handlePngExport} disabled={!results}>
          PNG出力
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
        >
          CSVインポート
        </Button>
        <Link href="/compare">
          <Button size="sm" variant="ghost">
            比較画面へ
          </Button>
        </Link>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void handleCsvImport(file);
            }
            e.target.value = "";
          }}
        />
      </div>
      {message && (
        <p className="text-xs text-slate-600" role="status">
          {message}
        </p>
      )}
      <SavePlanDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        onSaved={(id, destination) => {
          const destLabel =
            destination === "drive" ? "Google Drive" : "ローカル";
          setMessage(`${destLabel}に保存しました（ID: ${id.slice(0, 12)}…）`);
        }}
      />
    </div>
  );
}
