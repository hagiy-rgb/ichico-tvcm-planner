"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpButton } from "@/components/ui/help-button";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { formatNumber, formatYen } from "@/lib/utils/number-format";

export function OptimalGrpPanel() {
  const results = useSimulationStore((s) => s.results);
  const input = useSimulationStore((s) => s.input);

  if (!results) {
    return null;
  }

  const { optimalGrp, webReplace } = results;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>最効率 GRP の目安</CardTitle>
            <HelpButton termId="optimalGrp" />
          </div>
          <p className="text-sm text-slate-600">
            ターゲット「{input.target}」の参考値です。方式A・B・Cとも本計算と同じ局合成リーチ（CM秒数の実効GRP・局GRP按分込み）で評価します。
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border-2 border-sky-200 bg-sky-50/90 p-4 sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-medium text-sky-800">
              方式C: ターゲット最安リーチ単価
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {optimalGrp.minReachUnitPriceGrp != null
                ? `GRP ${formatNumber(optimalGrp.minReachUnitPriceGrp)}`
                : "—"}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {optimalGrp.minReachUnitPrice != null
                ? `リーチ単価 ${formatYen(optimalGrp.minReachUnitPrice)} / %`
                : "リーチ単価 —"}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              リーチカーブ上でリーチ単価（円/%）が最小となるポイント
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-medium text-slate-500">
              方式A: web動画との効率比較
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {optimalGrp.webParityGrp != null
                ? `GRP ${formatNumber(optimalGrp.webParityGrp)}`
                : "効率が逆転せず"}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {optimalGrp.webParityGrp != null
                ? `TVのリーチ千人単価が、web動画ベンチマーク（${formatYen(optimalGrp.webVideoCpmUsed * 1000)}/千再生）以下になる最小GRP`
                : `探索範囲（〜${formatNumber(optimalGrp.searchMaxGrp)} GRP）内で、TVのリーチ千人単価が web動画ベンチマーク（${formatYen(optimalGrp.webVideoCpmUsed * 1000)}/千再生）を下回りません`}
            </p>
            {Number.isFinite(results.costPerThousandReached) ? (
              <p className="mt-1 text-xs text-slate-500">
                現在GRPのリーチ千人単価: {formatYen(results.costPerThousandReached)}/千人
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-medium text-slate-500">
              方式B: 限界効率法
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {optimalGrp.marginalEfficiencyGrp != null
                ? `GRP ${formatNumber(optimalGrp.marginalEfficiencyGrp)}`
                : "範囲内で未到達"}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {optimalGrp.marginalPeakGrp != null
                ? `限界リーチ効率のピーク（GRP ${formatNumber(optimalGrp.marginalPeakGrp)}）から50%まで低下するポイント`
                : "限界リーチ効率のピークから50%まで低下するポイント"}
              {optimalGrp.marginalEfficiencyGrp == null
                ? `（探索上限 ${formatNumber(optimalGrp.searchMaxGrp)} GRP）`
                : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      {webReplace ? (
        <Card className="border-rose-200 bg-rose-50/40">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">web動画へのリプレイス提案</CardTitle>
              <HelpButton termId="webReplace" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-slate-800">{webReplace.message}</p>
            <dl className="grid gap-2 sm:grid-cols-3 text-xs">
              <div>
                <dt className="text-slate-500">web単価</dt>
                <dd className="font-semibold">
                  {formatYen(webReplace.webUnitPriceYen)}/人
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">TV推奨上限GRP</dt>
                <dd className="font-semibold">
                  {webReplace.tvKeepGrp != null
                    ? formatNumber(webReplace.tvKeepGrp)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">リプレイス候補金額</dt>
                <dd className="font-semibold text-rose-800">
                  {formatYen(webReplace.replaceableBudget)}
                  <span className="ml-1 font-normal text-slate-500">
                    （{formatNumber(Math.round(webReplace.replaceableGrp))} GRP）
                  </span>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
