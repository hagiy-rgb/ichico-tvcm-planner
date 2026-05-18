"use client";

import { AwarenessCurveChart } from "@/components/charts/AwarenessCurveChart";
import { ReachCurveChart } from "@/components/charts/ReachCurveChart";
import { StationReachChart } from "@/components/charts/StationReachChart";
import { CostBreakdownChart } from "@/components/charts/CostBreakdownChart";
import { KpiCard } from "@/components/kpi-cards/KpiCard";
import { OptimalGrpPanel } from "@/components/kpi-cards/OptimalGrpPanel";
import { ExportToolbar } from "@/components/export/ExportToolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSimulationStore } from "@/lib/stores/simulation-store";

const EXPORT_ROOT_ID = "simulation-results-export";
import {
  formatNumber,
  formatPercent,
  formatYen,
} from "@/lib/utils/number-format";

export function SimulationResultsPanel() {
  const results = useSimulationStore((s) => s.results);
  const input = useSimulationStore((s) => s.input);

  if (!results) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-500">
          条件を確認してください。計算に必要なマスタが見つからない可能性があります。
        </CardContent>
      </Card>
    );
  }

  const reachPercent = results.reachRate * 100;

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        シミュレーション値です。実出稿結果との誤差を想定してご利用ください。
        絵柄: {results.patternLabel}（k補正 {results.kPatternCoefficient.toFixed(3)}
        {results.kPatternSource === "dayparts" ? "・実測" : "・経験則"}）／リーチ k=
        {results.kEffective.toFixed(4)}、F=
        {input.coefficients.effectiveFrequency}／認知 Adstock=
        {results.finalAdstock.toFixed(1)}（λ週次=
        {results.lambdaWeekly.toFixed(2)}、α変換=
        {input.coefficients.alphaConversion.toFixed(2)}、認知α=
        {results.alphaAwareness.toFixed(3)}）／局合成リーチ{" "}
        {input.selectedStations.length}局（単純平均{" "}
        {(results.averageStationReachRate * 100).toFixed(2)}%）
      </p>

      <OptimalGrpPanel />

      {results.awarenessLinearWarning && (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-xs text-sky-900">
          認知率の線形近似は合計 GRP 500〜1500 帯で有効です（マスタ注記）。現在の GRP=
          {input.grp} では飽和や過小評価の可能性があります。
        </p>
      )}

      {results.awarenessSaturated && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-900">
          算出認知率が100%を超えたため、表示は100%に上限を設けています。GRPまたは係数の見直しを推奨します。
        </p>
      )}

      <div id={EXPORT_ROOT_ID} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <KpiCard
          label="リーチ率"
          value={formatPercent(reachPercent, 2)}
          sub={`${formatNumber(results.reachCount)}人 / ${formatNumber(results.population)}人`}
          termId="reach"
          logicId="reach"
          precision={results.precision}
        />
        <KpiCard
          label="広告認知率"
          value={formatPercent(results.awarenessRate, 2)}
          sub={`最終Adstock ${results.finalAdstock.toFixed(1)}`}
          termId="awareness"
          logicId="awareness"
          precision={results.precision}
        />
        <KpiCard
          label="出稿総額"
          value={formatYen(results.totalBudget)}
          sub={`パーコスト ${formatYen(results.perCost)}/GRP`}
          termId="perCost"
          logicId="budget"
          precision={results.precision}
        />
        <KpiCard
          label="CPM"
          value={formatYen(results.cpm)}
          sub="1,000インプレッションあたり"
          termId="cpm"
          logicId="cpm"
          precision={results.precision}
        />
        <KpiCard
          label="リーチ単価"
          value={
            Number.isFinite(results.reachUnitPrice)
              ? formatYen(results.reachUnitPrice)
              : "—"
          }
          sub="リーチ率1%あたり"
          termId="reachUnitPrice"
          logicId="reachUnitPrice"
          precision={results.precision}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>リーチカーブ</CardTitle>
          </CardHeader>
          <CardContent>
            <ReachCurveChart data={results.reachCurve} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>認知率推移（週次）</CardTitle>
          </CardHeader>
          <CardContent>
            <AwarenessCurveChart data={results.awarenessCurve} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>局別リーチ率</CardTitle>
          </CardHeader>
          <CardContent>
            <StationReachChart data={results.stationReachRows} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>コスト構造</CardTitle>
          </CardHeader>
          <CardContent>
            <CostBreakdownChart
              totalBudget={results.totalBudget}
              reachCount={results.reachCount}
              cpm={results.cpm}
            />
          </CardContent>
        </Card>
      </div>
      </div>

      <ExportToolbar exportRootId={EXPORT_ROOT_ID} />
    </div>
  );
}
