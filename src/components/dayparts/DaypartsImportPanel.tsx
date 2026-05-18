"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDaypartsStore } from "@/lib/stores/dayparts-store";
import { useSimulationStore } from "@/lib/stores/simulation-store";

export function DaypartsImportPanel() {
  const area = useSimulationStore((s) => s.input.area);
  const target = useSimulationStore((s) => s.input.target);
  const daypartsId = useSimulationStore((s) => s.input.daypartsId);
  const setDaypartsId = useSimulationStore((s) => s.setDaypartsId);
  const results = useSimulationStore((s) => s.results);

  const hydrate = useDaypartsStore((s) => s.hydrate);
  const loaded = useDaypartsStore((s) => s.loaded);
  const importFile = useDaypartsStore((s) => s.importFile);
  const removeDataset = useDaypartsStore((s) => s.removeDataset);
  const listForArea = useDaypartsStore((s) => s.listForArea);

  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const areaDatasets = listForArea(area);
  const active = areaDatasets.find((d) => d.id === daypartsId);

  const handleImport = async (file: File) => {
    setError(null);
    setMessage(null);
    try {
      const { data, warnings } = await importFile(file, area);
      setDaypartsId(data.id);
      const warnText =
        warnings.length > 0 ? `（警告: ${warnings.slice(0, 2).join(" / ")}）` : "";
      setMessage(`インポート完了: ${data.fileName}${warnText}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "インポートに失敗しました");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">曜日・時間区分（高精度モード）</CardTitle>
        <p className="text-xs text-slate-500">
          ビデオリサーチPM Plus形式のExcelを読み込むと、絵柄ごとの実効視聴率係数で k
          を補正します（標準モードの経験則より精度向上）。
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            Excelインポート
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDaypartsId(null);
              setMessage("標準モード（経験則係数）に戻しました");
            }}
          >
            標準モードに戻す
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleImport(file);
              }
              e.target.value = "";
            }}
          />
        </div>

        {!loaded ? (
          <p className="text-xs text-slate-400">読み込み中…</p>
        ) : areaDatasets.length > 0 ? (
          <label className="block text-xs text-slate-600">
            エリア「{area}」のインポート済みデータ
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              value={daypartsId ?? ""}
              onChange={(e) =>
                setDaypartsId(e.target.value ? e.target.value : null)
              }
            >
              <option value="">（未使用・標準モード）</option>
              {areaDatasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fileName} · {d.periodStart || "期間不明"}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-xs text-slate-500">
            このエリア向けの保存データはまだありません。
          </p>
        )}

        {active && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            高精度モード: {active.fileName}（ターゲット「{target}」に最も近いシートを使用）
            {active.unmappedStations.length > 0 && (
              <span className="block mt-1 text-amber-800">
                未マッピング局: {active.unmappedStations.join(", ")}
              </span>
            )}
          </p>
        )}

        {results?.kPatternSource === "dayparts" && (
          <p className="text-xs text-slate-600">
            k補正（実測）: {results.kPatternCoefficient.toFixed(3)} · 精度ラベル: 高精度
          </p>
        )}

        {message && <p className="text-xs text-slate-600">{message}</p>}
        {error && <p className="text-xs text-rose-600">{error}</p>}

        {active && (
          <Button
            size="sm"
            variant="ghost"
            className="text-rose-600"
            onClick={() => void removeDataset(active.id)}
          >
            このデータを削除
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
