"use client";

import { Card, CardContent } from "@/components/ui/card";
import { buildDecisionSummary } from "@/lib/engines/decision-summary";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import {
  formatGrp,
  formatPersonUnitPrice,
  formatYen,
} from "@/lib/utils/number-format";

function signedYen(value: number): string {
  const abs = formatYen(Math.abs(value));
  if (value > 0) return `+${abs}`;
  if (value < 0) return `−${abs}`;
  return abs;
}

function signedGrp(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) return `+${formatGrp(rounded)}`;
  if (rounded < 0) return `−${formatGrp(Math.abs(rounded))}`;
  return formatGrp(0);
}

export function DecisionStrip() {
  const results = useSimulationStore((s) => s.results);
  const input = useSimulationStore((s) => s.input);

  if (!results) return null;

  const decision = buildDecisionSummary(input, results);
  const currentPerson = results.reachPersonUnitPrice;
  const recommendedPerson =
    decision.recommendedGrp != null &&
    results.reachCount > 0 &&
    results.perCost > 0
      ? // 近似: 推奨GRPでの人数単価はカーブ点があれば使う
        results.reachCurve.find((p) => p.grp === decision.recommendedGrp)
          ?.reachPersonUnitPrice ?? null
      : null;

  return (
    <Card className="border-sky-200 bg-sky-50/70">
      <CardContent className="space-y-3 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
          判定
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">現状 GRP</p>
            <p className="text-xl font-bold text-slate-900">
              {formatGrp(decision.currentGrp)}
            </p>
            <p className="text-xs text-slate-500">
              リーチ人数単価{" "}
              {Number.isFinite(currentPerson)
                ? `${formatPersonUnitPrice(currentPerson)}/人`
                : "—"}
            </p>
            <p className="text-xs text-slate-500">
              リーチ1%あたり{" "}
              {decision.currentUnitPrice != null
                ? `${formatYen(decision.currentUnitPrice)}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">推奨 GRP</p>
            <p className="text-xl font-bold text-slate-900">
              {decision.recommendedGrp != null
                ? formatGrp(decision.recommendedGrp)
                : "—"}
            </p>
            <p className="text-xs text-slate-500">
              最安付近の人数単価{" "}
              {recommendedPerson != null && Number.isFinite(recommendedPerson)
                ? `${formatPersonUnitPrice(recommendedPerson)}/人`
                : "—"}
            </p>
            <p className="text-xs text-slate-500">
              リーチ1%あたり{" "}
              {decision.recommendedUnitPrice != null
                ? `${formatYen(decision.recommendedUnitPrice)}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">差分</p>
            <p className="text-xl font-bold text-slate-900">
              {decision.deltaGrp != null ? signedGrp(decision.deltaGrp) : "—"}
            </p>
            <p className="text-xs text-slate-500">
              出稿総額{" "}
              {decision.deltaBudget != null
                ? signedYen(decision.deltaBudget)
                : "—"}
            </p>
          </div>
        </div>
        <p className="text-sm font-medium text-slate-800">{decision.action}</p>
      </CardContent>
    </Card>
  );
}
