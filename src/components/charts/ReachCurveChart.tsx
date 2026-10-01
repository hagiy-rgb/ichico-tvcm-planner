"use client";

import { useMemo, useState } from "react";
import {
  ReachCurveChartBody,
  type ReachXAxisMode,
  type ReachYAxisMode,
} from "@/components/charts/reach-curve/ReachCurveChartBody";
import { AxisModeToggle } from "@/components/charts/shared/AxisModeToggle";
import { summarizePeriodAllocation } from "@/lib/engines/grp-schedule";
import { listTargetsForArea } from "@/lib/masters/area-master";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import type { ReachCurvePoint } from "@/types/simulation";

function ReachCurveChartStatic({
  data,
  yAxisMode = "rate",
  xAxisMode = "grp",
  showUnitPrice = true,
  perCost = 0,
  inputGrp,
  chartHeight,
}: {
  data: ReachCurvePoint[];
  yAxisMode?: ReachYAxisMode;
  xAxisMode?: ReachXAxisMode;
  showUnitPrice?: boolean;
  perCost?: number;
  inputGrp?: number;
  chartHeight?: number;
}) {
  return (
    <ReachCurveChartBody
      series={[{ target: "リーチ", points: data }]}
      yAxisMode={yAxisMode}
      xAxisMode={xAxisMode}
      showUnitPrice={showUnitPrice}
      perCost={perCost}
      inputGrp={inputGrp}
      chartHeight={chartHeight}
    />
  );
}

export function ReachCurveChart({
  data,
  yAxisMode: yAxisModeProp,
  chartHeight,
}: {
  data?: ReachCurvePoint[];
  yAxisMode?: ReachYAxisMode;
  /** グラフの高さ（px）。比較画面などコンパクト表示用 */
  chartHeight?: number;
}) {
  const [yAxisMode, setYAxisMode] = useState<ReachYAxisMode>(
    yAxisModeProp ?? "rate",
  );
  const [xAxisMode, setXAxisMode] = useState<ReachXAxisMode>("grp");
  const [showUnitPrice, setShowUnitPrice] = useState(true);

  if (data) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <AxisModeToggle
            label="第1軸（タテ）"
            mode={yAxisMode}
            onChange={setYAxisMode}
            options={[
              { value: "rate", label: "リーチ率" },
              { value: "count", label: "リーチ人数" },
            ]}
          />
          <AxisModeToggle
            label="ヨコ軸"
            mode={xAxisMode}
            onChange={setXAxisMode}
            options={[
              { value: "grp", label: "GRP" },
              { value: "budget", label: "出稿金額" },
            ]}
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={showUnitPrice}
            onChange={(e) => setShowUnitPrice(e.target.checked)}
          />
          リーチ人数単価グラフを表示
        </label>
        <ReachCurveChartStatic
          data={data}
          yAxisMode={yAxisMode}
          xAxisMode={xAxisMode}
          showUnitPrice={showUnitPrice}
          chartHeight={chartHeight}
        />
      </div>
    );
  }
  return (
    <ReachCurveChartInteractive
      yAxisMode={yAxisMode}
      onYAxisModeChange={setYAxisMode}
      xAxisMode={xAxisMode}
      onXAxisModeChange={setXAxisMode}
      showUnitPrice={showUnitPrice}
      onShowUnitPriceChange={setShowUnitPrice}
      chartHeight={chartHeight}
    />
  );
}

function ReachCurveChartInteractive({
  yAxisMode,
  onYAxisModeChange,
  xAxisMode,
  onXAxisModeChange,
  showUnitPrice,
  onShowUnitPriceChange,
  chartHeight,
}: {
  yAxisMode: ReachYAxisMode;
  onYAxisModeChange: (mode: ReachYAxisMode) => void;
  xAxisMode: ReachXAxisMode;
  onXAxisModeChange: (mode: ReachXAxisMode) => void;
  showUnitPrice: boolean;
  onShowUnitPriceChange: (value: boolean) => void;
  chartHeight?: number;
}) {
  const input = useSimulationStore((s) => s.input);
  const storedCurve = useSimulationStore((s) => s.results?.reachCurve);
  const perCost = useSimulationStore((s) => s.results?.perCost ?? 0);
  const selectedTargets = useSimulationStore((s) => s.curveTargets);
  const setCurveTargets = useSimulationStore((s) => s.setCurveTargets);
  const multiTargetCurves = useSimulationStore((s) => s.multiTargetCurves);
  const periodSchedule = useSimulationStore(
    (s) => s.results?.periodGrpSchedule,
  );
  const granularity = useSimulationStore(
    (s) => s.results?.planningGranularity ?? "week",
  );
  const allTargets = useMemo(
    () => listTargetsForArea(input.area),
    [input.area],
  );
  const periodSummary = useMemo(
    () =>
      periodSchedule && periodSchedule.length > 0
        ? (grp: number) =>
            summarizePeriodAllocation(periodSchedule, grp, granularity)
        : undefined,
    [periodSchedule, granularity],
  );
  const webReplaceKeepGrp = useSimulationStore(
    (s) => s.results?.webReplace?.tvKeepGrp ?? null,
  );

  // カーブ計算はストア側で results 更新時に一度だけ実施される
  const series = useMemo(() => {
    if (multiTargetCurves.length > 0) {
      return multiTargetCurves;
    }
    if (storedCurve && storedCurve.length > 0) {
      return [{ target: input.target, points: storedCurve }];
    }
    return [];
  }, [input.target, multiTargetCurves, storedCurve]);

  const toggleTarget = (target: string) => {
    if (selectedTargets.includes(target)) {
      if (selectedTargets.length <= 1) return;
      setCurveTargets(selectedTargets.filter((t) => t !== target));
    } else {
      setCurveTargets([...selectedTargets, target]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <AxisModeToggle
          label="第1軸（タテ）"
          mode={yAxisMode}
          onChange={onYAxisModeChange}
          options={[
            { value: "rate", label: "リーチ率" },
            { value: "count", label: "リーチ人数" },
          ]}
        />
        <AxisModeToggle
          label="ヨコ軸"
          mode={xAxisMode}
          onChange={onXAxisModeChange}
          options={[
            { value: "grp", label: "GRP" },
            { value: "budget", label: "出稿金額" },
          ]}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={showUnitPrice}
          onChange={(e) => onShowUnitPriceChange(e.target.checked)}
        />
        リーチ人数単価グラフを表示
      </label>

      <div>
        <p className="mb-2 text-xs font-medium text-slate-700">ターゲット選択</p>
        <div className="flex flex-wrap gap-2">
          {allTargets.map((target) => (
            <label
              key={target}
              className="flex cursor-pointer items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              <input
                type="checkbox"
                checked={selectedTargets.includes(target)}
                onChange={() => toggleTarget(target)}
              />
              {target}
            </label>
          ))}
        </div>
      </div>

      <ReachCurveChartBody
        series={series}
        yAxisMode={yAxisMode}
        xAxisMode={xAxisMode}
        showUnitPrice={showUnitPrice}
        perCost={perCost}
        inputGrp={input.grp}
        chartHeight={chartHeight}
        periodSummary={periodSummary}
        webReplaceKeepGrp={webReplaceKeepGrp}
      />
    </div>
  );
}
