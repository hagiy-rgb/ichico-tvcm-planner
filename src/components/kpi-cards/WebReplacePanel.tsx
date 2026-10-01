"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpButton } from "@/components/ui/help-button";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import {
  formatGrp,
  formatPersonUnitPrice,
  formatYen,
} from "@/lib/utils/number-format";

/** web動画リプレイス提案のみ（最効率GRPパネルは廃止） */
export function WebReplacePanel() {
  const webReplace = useSimulationStore((s) => s.results?.webReplace);

  if (!webReplace) return null;

  return (
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
              {formatPersonUnitPrice(webReplace.webUnitPriceYen)}/人
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">TV推奨上限GRP</dt>
            <dd className="font-semibold">
              {webReplace.tvKeepGrp != null
                ? formatGrp(webReplace.tvKeepGrp)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">リプレイス候補金額</dt>
            <dd className="font-semibold text-rose-800">
              {formatYen(webReplace.replaceableBudget)}
              <span className="ml-1 font-normal text-slate-500">
                （{formatGrp(webReplace.replaceableGrp)} GRP）
              </span>
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
