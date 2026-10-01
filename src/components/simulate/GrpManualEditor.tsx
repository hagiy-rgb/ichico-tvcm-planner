"use client";

import { Label } from "@/components/ui/label";
import { NumberField } from "@/components/ui/number-field";
import {
  grpScheduleSum,
  normalizePlanningGranularity,
  periodLabel,
  periodUnitLabel,
  resolvePeriodGrpSchedule,
} from "@/lib/engines/grp-schedule";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { formatNumber } from "@/lib/utils/number-format";

const PREVIEW_MAX_PERIODS = 12;

export function GrpManualEditor() {
  const input = useSimulationStore((s) => s.input);
  const setManualGrpEnabled = useSimulationStore((s) => s.setManualGrpEnabled);
  const setCustomPeriodGrp = useSimulationStore((s) => s.setCustomPeriodGrp);

  const granularity = normalizePlanningGranularity(input.planningGranularity);
  const unit = periodUnitLabel(granularity);
  const periods = input.campaignPeriods ?? input.campaignWeeks;
  const manual = input.manualGrpEnabled ?? false;
  const schedule = resolvePeriodGrpSchedule({
    totalGrp: input.grp,
    periods,
    distribution: input.grpDistribution,
    customPeriodGrp: input.customPeriodGrp,
    manualEnabled: manual,
  });
  const sum = grpScheduleSum(schedule);

  const updateSlot = (index: number, value: number) => {
    const next = [...schedule];
    next[index] = Math.max(0, value);
    setCustomPeriodGrp(next);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
        <input
          type="checkbox"
          checked={manual}
          onChange={(e) => setManualGrpEnabled(e.target.checked)}
        />
        {unit}別GRPを手入力する
      </label>

      {manual ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-600">
            {unit}ごとの投下GRPを入力します。合計GRPは入力値の合計に自動で合わせ、合計GRPを変更すると配分比を保ったまま比例配分し直します。{unit}数を変えると配分の形を保ったまま伸縮します。
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {schedule.map((value, index) => (
              <div key={`${granularity}-${index}`}>
                <Label className="text-xs">{periodLabel(index, granularity)}</Label>
                <NumberField
                  value={value}
                  fractionDigits={1}
                  min={0}
                  step={1}
                  onCommit={(v) => updateSlot(index, v)}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-600">
            合計 {formatNumber(sum, 1)} GRP（{periods}
            {unit === "月" ? "か月" : "週"}）
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          配分プレビュー（{unit}あたりGRP）:{" "}
          {schedule
            .slice(0, PREVIEW_MAX_PERIODS)
            .map((v) => formatNumber(v, 1))
            .join(" / ")}
          {schedule.length > PREVIEW_MAX_PERIODS ? " …" : ""}
        </p>
      )}
    </div>
  );
}
