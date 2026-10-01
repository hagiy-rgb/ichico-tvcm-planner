"use client";

import { useMemo } from "react";
import { TornadoChart } from "@/components/charts/TornadoChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { listTargetsForArea } from "@/lib/masters/area-master";
import { useSimulationStore } from "@/lib/stores/simulation-store";

export function LeverageBottleneckPanel() {
  const input = useSimulationStore((s) => s.input);
  const results = useSimulationStore((s) => s.results);
  const analysis = useSimulationStore((s) => s.leverage);
  const leveragePending = useSimulationStore((s) => s.leveragePending);
  const analysisTarget = useSimulationStore((s) => s.analysisTarget);
  const setAnalysisTarget = useSimulationStore((s) => s.setAnalysisTarget);
  const targetOptions = useMemo(
    () => listTargetsForArea(input.area),
    [input.area],
  );

  if (!results) {
    return null;
  }

  if (!analysis) {
    return leveragePending ? (
      <p className="py-4 text-center text-sm text-slate-500">感度分析を計算中です…</p>
    ) : null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>リーチ最大化：レバレッジ／ボトルネック</CardTitle>
        <p className="text-sm text-slate-600">
          OAT感度（Tornado）と、現状プランからリーチを伸ばすための改善ストーリーを提示します。
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="max-w-xs">
          <label className="text-xs font-medium text-slate-700">
            分析ターゲット
          </label>
          <Select
            value={analysisTarget}
            onChange={setAnalysisTarget}
            className="mt-1"
          >
            {targetOptions.map((target) => (
              <option key={target} value={target}>
                {target}
              </option>
            ))}
          </Select>
        </div>

        {analysis.insights.length > 0 && (
          <ul className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm">
            {analysis.insights.map((item, i) => (
              <li
                key={i}
                className={
                  item.kind === "leverage"
                    ? "text-sky-900"
                    : "text-amber-900"
                }
              >
                <span className="font-medium">
                  {item.kind === "leverage" ? "★ レバレッジ: " : "⚠ ボトルネック: "}
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        )}

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">
            改善ストーリー
          </h3>
          <div className="whitespace-pre-wrap rounded-lg border border-sky-200 bg-sky-50/70 p-4 text-sm leading-relaxed text-slate-800">
            {analysis.improvementStory}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">
            感度分析（Tornado）
          </h3>
          <p className="mb-2 text-xs text-slate-500">
            各要因を単独で動かしたときのリーチ人数の変動幅。上ほど影響が大きい順です。局選定・局GRP按分も影響が大きい場合のみ含めます。
          </p>
          <TornadoChart data={analysis.tornado} />
        </div>

        <p className="text-xs text-slate-500">
          出典注記: リーチはポアソン＋局合成モデルに基づくシミュレーション値。感度はOAT（One-at-a-time）近似です。
        </p>
      </CardContent>
    </Card>
  );
}
