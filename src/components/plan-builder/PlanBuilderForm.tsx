"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpButton } from "@/components/ui/help-button";
import { Label } from "@/components/ui/label";
import { NumberField } from "@/components/ui/number-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { listAreas, listTargetsForArea } from "@/lib/masters/area-master";
import { listIndustries } from "@/lib/masters/industry-master";
import {
  lambdaForGranularity,
  periodImpactFactor,
} from "@/lib/engines/awareness-engine";
import {
  MAX_CAMPAIGN_PERIODS,
  normalizePlanningGranularity,
  WEEKS_PER_MONTH,
  type GrpDistributionPreset,
  type PlanningGranularity,
} from "@/lib/engines/grp-schedule";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { formatGrp, formatYen } from "@/lib/utils/number-format";

const GRP_PRESETS: Array<{ value: GrpDistributionPreset; label: string }> = [
  { value: "even", label: "均等" },
  { value: "front_heavy", label: "前厚" },
  { value: "back_heavy", label: "後厚" },
];

const GRANULARITY_OPTIONS: Array<{ value: PlanningGranularity; label: string }> = [
  { value: "week", label: "週次" },
  { value: "month", label: "月次" },
];

export function PlanBuilderForm() {
  const input = useSimulationStore((s) => s.input);
  const results = useSimulationStore((s) => s.results);
  const curveTargets = useSimulationStore((s) => s.curveTargets);
  const setArea = useSimulationStore((s) => s.setArea);
  const setTargets = useSimulationStore((s) => s.setTargets);
  const setIndustryCode = useSimulationStore((s) => s.setIndustryCode);
  const setGrp = useSimulationStore((s) => s.setGrp);
  const setTotalBudgetYen = useSimulationStore((s) => s.setTotalBudgetYen);
  const setPlanningGranularity = useSimulationStore(
    (s) => s.setPlanningGranularity,
  );
  const setCampaignPeriods = useSimulationStore((s) => s.setCampaignPeriods);
  const setGrpDistribution = useSimulationStore((s) => s.setGrpDistribution);
  const setCmLength = useSimulationStore((s) => s.setCmLength);
  const setWebVideoReachUnitPriceYen = useSimulationStore(
    (s) => s.setWebVideoReachUnitPriceYen,
  );

  const [budgetMode, setBudgetMode] = useState<"grp" | "yen">("grp");

  const granularity = normalizePlanningGranularity(input.planningGranularity);
  const periods = input.campaignPeriods ?? input.campaignWeeks;
  const lambdaWeekly = input.coefficients.lambdaWeekly;
  const selectedTargets =
    curveTargets.length > 0 ? curveTargets : [input.target];
  const totalBudget =
    results?.totalBudget ??
    (results?.perCost != null ? input.grp * results.perCost : null);

  const areas = useMemo(() => listAreas(), []);
  const targets = useMemo(
    () => listTargetsForArea(input.area),
    [input.area],
  );
  const industries = useMemo(() => listIndustries(), []);

  const toggleTarget = (target: string) => {
    if (selectedTargets.includes(target)) {
      if (selectedTargets.length <= 1) return;
      setTargets(selectedTargets.filter((t) => t !== target));
    } else {
      setTargets([...selectedTargets, target]);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Step 1: エリア・条件</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="area">エリア</Label>
            <Select
              id="area"
              value={input.area}
              onChange={setArea}
              className="mt-1"
            >
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>ターゲット（複数選択可）</Label>
            <p className="mt-1 text-xs text-slate-500">
              先頭にチェックしたターゲットを主指標に使い、選択した全ターゲットをリーチカーブに重ねます。
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {targets.map((target) => {
                const checked = selectedTargets.includes(target);
                const isPrimary = selectedTargets[0] === target;
                return (
                  <label
                    key={target}
                    className={`flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1 text-xs ${
                      checked
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTarget(target)}
                    />
                    <span>
                      {target}
                      {isPrimary ? "（主）" : ""}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <Label htmlFor="industry">業界カテゴリ</Label>
            <Select
              id="industry"
              value={input.industryCode}
              onChange={setIndustryCode}
              className="mt-1"
            >
              {industries.map((ind) => (
                <option key={ind.code} value={ind.code}>
                  {ind.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="cm-length">CM秒数</Label>
            <Select
              id="cm-length"
              value={String(input.cmLength)}
              onChange={(v) => setCmLength(Number(v) as 15 | 30)}
              className="mt-1"
            >
              <option value="15">15秒</option>
              <option value="30">30秒</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 2: 出稿量・期間</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <div className="flex items-center gap-1">
              <Label>予算入力</Label>
              <HelpButton termId="grp" />
            </div>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="budget-mode"
                  checked={budgetMode === "grp"}
                  onChange={() => setBudgetMode("grp")}
                />
                GRP（合計）
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="budget-mode"
                  checked={budgetMode === "yen"}
                  onChange={() => setBudgetMode("yen")}
                />
                出稿金額（合計・円）
              </label>
            </div>
            {budgetMode === "grp" ? (
              <NumberField
                id="grp"
                value={input.grp}
                min={0}
                step={10}
                fractionDigits={1}
                onCommit={setGrp}
                className="mt-2"
              />
            ) : (
              <NumberField
                id="budget-yen"
                value={Math.round(totalBudget ?? 0)}
                min={0}
                step={1}
                integer
                onCommit={(v) => setTotalBudgetYen(Math.round(v))}
                className="mt-2"
              />
            )}
            <p className="mt-1 text-xs text-slate-500">
              {budgetMode === "grp"
                ? `換算出稿金額 ${totalBudget != null ? formatYen(totalBudget) : "—"}（加重パーコスト × GRP）`
                : `換算GRP ${formatGrp(input.grp)}（出稿金額 ÷ 加重パーコスト）。出稿金額は整数円で入力します。`}
            </p>
            {input.manualGrpEnabled ? (
              <p className="mt-1 text-xs text-slate-500">
                期間別の手入力配分の合計です。変更すると配分比を保って比例配分し直します。手入力欄は認知率推移グラフの下にあります。
              </p>
            ) : null}
          </div>
          <div role="radiogroup" aria-labelledby="planning-granularity-label">
            <div className="flex items-center gap-1">
              <span
                id="planning-granularity-label"
                className="text-sm font-medium text-slate-700"
              >
                プランニング粒度
              </span>
              <HelpButton termId="planningGranularity" />
            </div>
            <div className="mt-2 flex flex-wrap gap-4">
              {GRANULARITY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="planning-granularity"
                    checked={granularity === option.value}
                    onChange={() => setPlanningGranularity(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {granularity === "month"
                ? `月次: 残存係数 λ_m = λ_w^${WEEKS_PER_MONTH} = ${lambdaForGranularity(lambdaWeekly, "month").toFixed(3)}、月内均等投下として当期効果 ×${periodImpactFactor(lambdaWeekly, "month").toFixed(2)} で認知を計算します。`
                : `週次: 残存係数 λ_w = ${lambdaWeekly.toFixed(2)} で週ごとに認知を積み上げます。`}
            </p>
          </div>
          <div>
            <Label htmlFor="campaign-periods">
              {granularity === "month" ? "出稿月数" : "出稿週数"}
            </Label>
            <NumberField
              id="campaign-periods"
              value={periods}
              min={1}
              max={MAX_CAMPAIGN_PERIODS[granularity]}
              step={1}
              integer
              onCommit={setCampaignPeriods}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="mb-2 block">GRP配分</Label>
            <div className="flex flex-wrap gap-4">
              {GRP_PRESETS.map((preset) => (
                <label
                  key={preset.value}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="grp-distribution"
                    checked={input.grpDistribution === preset.value}
                    onChange={() => setGrpDistribution(preset.value)}
                  />
                  {preset.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <Label htmlFor="web-unit-price">
                web動画 ターゲットリーチ人数単価（円/人・任意）
              </Label>
              <HelpButton termId="webReplace" />
            </div>
            <Input
              id="web-unit-price"
              type="number"
              min={0}
              step={0.1}
              value={
                input.webVideoReachUnitPriceYen != null
                  ? String(input.webVideoReachUnitPriceYen)
                  : ""
              }
              placeholder="例: 2.3"
              onChange={(v) => {
                const n = Number(v);
                setWebVideoReachUnitPriceYen(
                  v.trim() === "" || !Number.isFinite(n) ? null : n,
                );
              }}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-slate-500">
              入力すると、TVのリーチ人数単価がこの値を上回る帯を動画広告へリプレイス可能な余地として提案します。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
