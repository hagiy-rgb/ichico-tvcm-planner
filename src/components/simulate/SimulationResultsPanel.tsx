"use client";

import { AwarenessCurveChart } from "@/components/charts/AwarenessCurveChart";
import { ReachCurveChart } from "@/components/charts/ReachCurveChart";
import { StationReachChart } from "@/components/charts/StationReachChart";
import { LeverageBottleneckPanel } from "./LeverageBottleneckPanel";
import { GrpManualEditor } from "./GrpManualEditor";
import { KpiCard } from "@/components/kpi-cards/KpiCard";
import { DecisionStrip } from "@/components/kpi-cards/DecisionStrip";
import { WebReplacePanel } from "@/components/kpi-cards/WebReplacePanel";
import { ExportToolbar } from "@/components/export/ExportToolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import {
  formatNumber,
  formatPercent,
  formatPersonUnitPrice,
  formatSpotCount,
  formatYen,
} from "@/lib/utils/number-format";

const EXPORT_ROOT_ID = "simulation-results-export";

export function SimulationResultsPanel() {
  const results = useSimulationStore((s) => s.results);
  const input = useSimulationStore((s) => s.input);
  const calcError = useSimulationStore((s) => s.calcError);
  const isCalculating = useSimulationStore((s) => s.isCalculating);
  const hydrationStatus = useSimulationStore((s) => s.hydrationStatus);

  if (!results) {
    const waiting =
      hydrationStatus === "pending" || isCalculating;
    return (
      <Card>
        <CardContent className="space-y-2 py-8 text-center text-sm text-slate-500">
          {waiting ? (
            <p role="status">計算中です…</p>
          ) : (
            <>
              <p>
                条件を確認してください。計算に必要なマスタが見つからない可能性があります。
              </p>
              {calcError ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-left text-xs text-rose-900">
                  エラー詳細: {calcError}
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  入力を変更するか、ページを再読み込みしてください。
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const reachPercent = results.reachRate * 100;
  const isMonthly = results.planningGranularity === "month";
  const periodText = `${results.campaignPeriods}${isMonthly ? "か月" : "週"}`;

  return (
    <div className="relative space-y-4">
      {isCalculating ? (
        <p
          className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-xs text-sky-900"
          role="status"
        >
          更新中です。表示は前回の計算結果です。
        </p>
      ) : null}
      {calcError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-900">
          エラー詳細: {calcError}
        </p>
      ) : null}

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        シミュレーション値です。実出稿結果との誤差を想定してご利用ください。
        絵柄: {results.patternLabel}（k補正 {results.kPatternCoefficient.toFixed(3)}
        {results.kPatternSource === "dayparts" ? "・実測" : "・経験則"}）／リーチ k=
        {results.kEffective.toFixed(4)}、F=
        {input.coefficients.effectiveFrequency}／認知 Adstock=
        {results.finalAdstock.toFixed(1)}（{isMonthly ? "月次" : "週次"}
        {periodText}、λ週次=
        {results.lambdaWeekly.toFixed(2)}
        {isMonthly
          ? `→月次 λ_m=${results.lambdaPeriod.toFixed(3)}・当期効果×${results.periodImpactFactor.toFixed(2)}`
          : ""}
        、α変換=
        {input.coefficients.alphaConversion.toFixed(2)}、MaxA=
        {results.maxAwareness.toFixed(0)}%、K=
        {results.halfSaturationAdstock.toFixed(0)}）／局合成リーチ{" "}
        {input.selectedStations.length}局（単純平均{" "}
        {(results.averageStationReachRate * 100).toFixed(2)}%）
      </p>

      <div id={EXPORT_ROOT_ID} className="space-y-4">
        <CollapsibleSection
          title="サマリー"
          description="判定と主要KPI"
          defaultOpen
        >
          <DecisionStrip />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              label="リーチ率 / リーチ人数"
              value={
                <div className="flex flex-col gap-1">
                  <span>{formatPercent(reachPercent, 2)}</span>
                  <span>{formatNumber(results.reachCount)}人</span>
                </div>
              }
              sub={`母数 ${formatNumber(results.population)}人`}
              termId="reach"
              logicId="reach"
              precision={results.precision}
            />
            <KpiCard
              label="広告認知率"
              value={formatPercent(results.awarenessRate, 2)}
              sub={
                isMonthly
                  ? `${periodText}後・月次残存λ ${results.lambdaPeriod.toFixed(3)}`
                  : `${periodText}後・最終Adstock ${results.finalAdstock.toFixed(1)}`
              }
              termId="awareness"
              logicId="awareness"
              precision={results.precision}
            />
            <KpiCard
              label="出稿総額"
              value={formatYen(results.totalBudget)}
              sub={
                <div className="space-y-1">
                  <p>加重パーコスト {formatYen(results.perCost)}/GRP</p>
                  <ul className="space-y-0.5">
                    {results.stationBudgetBreakdown.map((row) => (
                      <li key={row.station}>
                        {row.displayName}: {formatYen(row.budget)}（
                        {row.budgetSharePercent.toFixed(2)}%）
                        {row.estimatedSpots != null
                          ? `／目安 ${formatSpotCount(row.estimatedSpots)}本`
                          : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              }
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
              label="リーチ人数単価"
              value={
                Number.isFinite(results.reachPersonUnitPrice)
                  ? `${formatPersonUnitPrice(results.reachPersonUnitPrice)}/人`
                  : "—"
              }
              sub={
                <div className="space-y-0.5">
                  <p>出稿金額 ÷ リーチ人数</p>
                  <p>
                    リーチ1%あたりの単価:{" "}
                    {Number.isFinite(results.reachUnitPrice)
                      ? formatYen(results.reachUnitPrice)
                      : "—"}
                  </p>
                </div>
              }
              termId="reachUnitPrice"
              logicId="reachUnitPrice"
              precision={results.precision}
            />
            <KpiCard
              label="ターゲット表示単価"
              value={
                Number.isFinite(results.displayUnitPrice)
                  ? `${formatPersonUnitPrice(results.displayUnitPrice)}/回`
                  : "—"
              }
              sub={
                <div className="space-y-0.5">
                  <p>出稿金額 ÷ ターゲットのべ表示回数</p>
                  <p>
                    （のべ表示回数 = (GRP/100) × ターゲット人口。web広告のインプレッション単価と同義）
                  </p>
                </div>
              }
              termId="displayUnitPrice"
              logicId="displayUnitPrice"
              precision={results.precision}
            />
          </div>

          <WebReplacePanel />
        </CollapsibleSection>

        <CollapsibleSection
          title="リーチ分析"
          description="リーチカーブ・局別リーチ"
        >
          <Card>
            <CardHeader>
              <CardTitle>リーチカーブ</CardTitle>
            </CardHeader>
            <CardContent>
              <ReachCurveChart />
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
        </CollapsibleSection>

        <CollapsibleSection
          title="感度分析"
          description="Tornadoと文章による改善示唆"
        >
          <LeverageBottleneckPanel />
        </CollapsibleSection>

        <CollapsibleSection
          title="認知分析"
          description={`${isMonthly ? "月次" : "週次"}の認知率推移（Adstockモデル）`}
        >
          {results.awarenessZone === "ramp" && (
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-xs text-sky-900">
              認知率が上限 MaxAwareness の{" "}
              {(results.awarenessSaturationRatio * 100).toFixed(0)}%
              にとどまる立ち上がり域です。この帯は半飽和点 K の設定誤差が結果に大きく効くため、実測認知データでの校正を推奨します。
            </p>
          )}

          {results.awarenessZone === "saturated" && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
              認知率が上限 MaxAwareness の{" "}
              {(results.awarenessSaturationRatio * 100).toFixed(0)}%
              に達する飽和域です。追加GRPによる認知の上積みは小さく、期間分散やクリエイティブ改善の方が効く可能性があります。
            </p>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                認知率推移（{isMonthly ? "月次" : "週次"}・{periodText}）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AwarenessCurveChart
                data={results.awarenessCurve}
                granularity={results.planningGranularity}
              />
            </CardContent>
          </Card>

          <GrpManualEditor />
        </CollapsibleSection>
      </div>

      <ExportToolbar exportRootId={EXPORT_ROOT_ID} />
    </div>
  );
}
