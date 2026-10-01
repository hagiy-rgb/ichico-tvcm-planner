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
      <div className="flex h-[calc(100dvh-3.75rem)] flex-col overflow-hidden">
        <div className="shrink-0 px-4 pb-2 pt-4">
          <h1 className="text-2xl font-bold text-slate-900">シミュレーション</h1>
          <p className="mt-1 text-sm text-slate-600">
            エリア・絵柄・係数を入力すると、リーチとコスト指標がリアルタイムで更新されます。
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-x-auto">
          <div className="grid h-full min-w-[720px] w-full grid-cols-[minmax(320px,400px)_minmax(0,1fr)] gap-4">
            <aside className="h-full space-y-4 overflow-y-auto overscroll-contain px-4 pb-8">
              <PlanBuilderForm />
              <DaypartsImportPanel />
              <PatternEditor />
              <StationSelector />
              <CoefficientTuner />
            </aside>
            <section className="h-full min-w-0 overflow-y-auto overscroll-contain px-4 pb-8">
              <SimulationResultsPanel />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
