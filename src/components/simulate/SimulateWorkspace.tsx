"use client";

import { PlanBuilderForm } from "@/components/plan-builder/PlanBuilderForm";
import { StationSelector } from "@/components/plan-builder/StationSelector";
import { PatternEditor } from "@/components/pattern-editor/PatternEditor";
import { CoefficientTuner } from "@/components/coefficient-tuner/CoefficientTuner";
import { DaypartsImportPanel } from "@/components/dayparts/DaypartsImportPanel";
import { SimulationDraftHydrator } from "./SimulationDraftHydrator";
import { SimulationResultsPanel } from "./SimulationResultsPanel";

export function SimulateWorkspace() {
  return (
    <>
      <SimulationDraftHydrator />
      <div className="mx-auto max-w-7xl space-y-6 p-4 pb-12 md:p-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">シミュレーション</h1>
          <p className="mt-1 text-sm text-slate-600">
            エリア・絵柄・係数を入力すると、リーチとコスト指標がリアルタイムで更新されます。
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
          <div className="space-y-4">
            <PlanBuilderForm />
            <DaypartsImportPanel />
            <StationSelector />
            <PatternEditor />
            <CoefficientTuner />
          </div>
          <SimulationResultsPanel />
        </div>
      </div>
    </>
  );
}
