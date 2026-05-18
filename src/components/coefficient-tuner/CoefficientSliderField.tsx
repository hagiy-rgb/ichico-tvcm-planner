"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IndustryCoefficientRange } from "@/types/master";
import { isQualityC } from "@/lib/engines/coefficient-engine";

type Props = {
  id: string;
  label: string;
  value: number;
  range: IndustryCoefficientRange;
  step?: number;
  unit?: string;
  extraNote?: string;
  onChange: (value: number) => void;
};

export function CoefficientSliderField({
  id,
  label,
  value,
  range,
  step = 0.01,
  unit,
  extraNote,
  onChange,
}: Props) {
  const showCWarning = isQualityC(range.quality);

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          type="number"
          value={value}
          step={step}
          min={range.min}
          max={range.max}
          onChange={(v) => onChange(Number(v))}
          className="w-28"
        />
      </div>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-slate-900"
      />
      <p className="text-xs text-slate-600">
        目安: {range.min} / 推奨 {range.typical} / {range.max}
        {unit ? ` ${unit}` : ""}
      </p>
      <p className="text-xs text-slate-500">
        出典: {range.source}（信頼度 {range.quality}）
      </p>
      {showCWarning && (
        <p className="text-xs text-amber-800">
          業界購買サイクルからの推定値です。出稿後の実データで校正を推奨します。
        </p>
      )}
      {extraNote && <p className="text-xs text-slate-500">{extraNote}</p>}
    </div>
  );
}
