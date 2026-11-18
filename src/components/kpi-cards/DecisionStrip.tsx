"use client";

import { Card, CardContent } from "@/components/ui/card";
import { buildDecisionSummary } from "@/lib/engines/decision-summary";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import {
  formatGrp,
  formatPercent,
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
  const applyRequiredGrpFromReachPlan = useSimulationStore(
    (s) => s.applyRequiredGrpFromReachPlan,
  );

  if (!results) return null;

  const decision = buildDecisionSummary(input, results);
  const currentPerson = results.reachPersonUnitPrice;
  const canApply =
    decision.requiredGrp != null &&
    Math.abs((decision.gapGrp ?? 0)) >= 1;

  return (
    <Card className="border-sky-200 bg-sky-50/70">
      <CardContent className="space-y-3 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
          判定（目標リーチ → 必要GRP）
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">現状</p>
            <p className="text-xl font-bold text-slate-900">
              {formatGrp(decision.currentGrp)} GRP
            </p>
            <p className="text-xs text-slate-500">
              リーチ {formatPercent(decision.currentReachRate * 100, 1)}
            </p>
            <p className="text-xs text-slate-500">
              人数単価{" "}
              {Number.isFinite(currentPerson)
                ? `${formatPersonUnitPrice(currentPerson)}/人`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">目標リーチ</p>
            <p className="text-xl font-bold text-slate-900">
              {formatPercent(decision.targetReachRate * 100, 1)}
            </p>
            <p className="text-xs text-slate-500">
              合計GRP・単一母集団ポアソン
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">必要 GRP / 予算</p>
            <p className="text-xl font-bold text-slate-900">
              {decision.requiredGrp != null
                ? formatGrp(decision.requiredGrp)
                : "到達不可"}
            </p>
            <p className="text-xs text-slate-500">
              {decision.requiredBudget != null
                ? formatYen(decision.requiredBudget)
                : "—"}
            </p>
            {canApply ? (
              <button
                type="button"
                onClick={applyRequiredGrpFromReachPlan}
                className="mt-2 rounded border border-sky-700 bg-white px-2 py-1 text-xs font-medium text-sky-900 hover:bg-sky-100"
              >
                必要GRPを適用
              </button>
            ) : null}
          </div>
          <div>
            <p className="text-xs text-slate-500">差分（必要 − 現状）</p>
            <p className="text-xl font-bold text-slate-900">
              {decision.gapGrp != null ? signedGrp(decision.gapGrp) : "—"}
            </p>
            <p className="text-xs text-slate-500">
              出稿総額{" "}
              {decision.gapBudget != null
                ? signedYen(decision.gapBudget)
                : "—"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              参考・最安単価{" "}
              {decision.recommendedGrp != null
                ? `${formatGrp(decision.recommendedGrp)} GRP`
                : "—"}
            </p>
          </div>
        </div>
        <p className="text-sm font-medium text-slate-800">{decision.action}</p>
      </CardContent>
    </Card>
  );
}
