"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpButton } from "@/components/ui/help-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  getAlphaConversionRange,
  getFunnelMultiplier,
  halfLifeWeeks,
  listFunnelStages,
  validateCoefficients,
} from "@/lib/engines/coefficient-engine";
import { getIndustryByCode } from "@/lib/masters/industry-master";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { CoefficientSliderField } from "./CoefficientSliderField";

export function CoefficientTuner() {
  const input = useSimulationStore((s) => s.input);
  const setFunnelStage = useSimulationStore((s) => s.setFunnelStage);
  const setCoefficients = useSimulationStore((s) => s.setCoefficients);
  const resetCoefficientsToRecommended = useSimulationStore(
    (s) => s.resetCoefficientsToRecommended,
  );

  const industry = getIndustryByCode(input.industryCode);
  const funnelStages = listFunnelStages();
  const funnelMeta = getFunnelMultiplier(input.funnelStage);

  const warnings = useMemo(() => {
    if (!industry) {
      return [];
    }
    return validateCoefficients(input.coefficients, {
      lambda: industry.lambda_weekly,
      alphaAwareness: industry.alpha_awareness,
    });
  }, [industry, input.coefficients]);

  if (!industry) {
    return null;
  }

  const halfLife = halfLifeWeeks(input.coefficients.lambdaWeekly);
  const alphaConversionRange = getAlphaConversionRange();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>係数チューニング</CardTitle>
          <HelpButton termId="adstock" />
        </div>
        <p className="text-sm text-slate-600">
          業界マスタの推奨値を起点に調整できます。表示される目安値はすべて
          industry_coefficients.json の記載のみです。
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="funnel-stage">購買ファネル段階</Label>
            <Select
              id="funnel-stage"
              value={input.funnelStage}
              onChange={(v) =>
                setFunnelStage(
                  v as typeof input.funnelStage,
                )
              }
              className="mt-1"
            >
              {funnelStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </Select>
            {funnelMeta.source && (
              <p className="mt-1 text-xs text-slate-500">
                λ補正 ×{funnelMeta.multiplier}（{funnelMeta.source}）
              </p>
            )}
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={resetCoefficientsToRecommended}>
              推奨値に戻す
            </Button>
          </div>
        </div>

        <CoefficientSliderField
          id="alpha-conversion"
          label="即時効果係数 α（GRP→Adstock）"
          value={input.coefficients.alphaConversion}
          range={alphaConversionRange}
          step={0.01}
          onChange={(alphaConversion) => setCoefficients({ alphaConversion })}
        />

        <CoefficientSliderField
          id="lambda-weekly"
          label="アドストック残存係数 λ（週次）"
          value={input.coefficients.lambdaWeekly}
          range={industry.lambda_weekly}
          step={0.01}
          extraNote={
            halfLife != null
              ? `半減期の目安: 約 ${halfLife.toFixed(1)} 週`
              : undefined
          }
          onChange={(lambdaWeekly) => setCoefficients({ lambdaWeekly })}
        />

        <CoefficientSliderField
          id="alpha-awareness"
          label="認知変換率 α（% / GRP）"
          value={input.coefficients.alphaAwareness}
          range={industry.alpha_awareness}
          step={0.005}
          unit={industry.alpha_awareness.unit}
          onChange={(alphaAwareness) => setCoefficients({ alphaAwareness })}
        />

        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
          <Label htmlFor="k-poisson">CM効果係数 k（ポアソン到達）</Label>
          <div className="flex items-center gap-3">
            <input
              id="k-poisson"
              type="number"
              className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={input.coefficients.kPoisson}
              step={0.0005}
              min={0}
              onChange={(e) =>
                setCoefficients({ kPoisson: Number(e.target.value) })
              }
            />
            <span className="text-xs text-slate-600">
              マスタ推奨: {industry.k_poisson.value}（信頼度{" "}
              {industry.k_poisson.quality}）
            </span>
          </div>
          {industry.k_poisson.note && (
            <p className="text-xs text-slate-500">{industry.k_poisson.note}</p>
          )}
        </div>

        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
          <Label htmlFor="effective-f">有効フリークエンシー F</Label>
          <input
            id="effective-f"
            type="number"
            className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={input.coefficients.effectiveFrequency}
            min={1}
            step={1}
            onChange={(e) =>
              setCoefficients({
                effectiveFrequency: Number(e.target.value) || 6,
              })
            }
          />
          <p className="text-xs text-slate-500">
            標準の初期値は 6（FSD）。有効到達の閾値接触回数です。
          </p>
        </div>

        {warnings.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {warnings.map((w) => (
              <li key={w.field}>{w.message}</li>
            ))}
          </ul>
        )}

        <p className="text-xs text-slate-500">
          認知率は Adstock の線形近似（α_awareness × Adstock）で算出します。500〜1500
          GRP 帯以外では精度が低下する可能性があります。
        </p>
      </CardContent>
    </Card>
  );
}
