"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * 数値入力。入力途中（空欄など）はローカルに保持し、数値として解釈できたときだけ
 * 範囲内に丸めて onCommit する。フォーカスを外すと確定値の表示に戻る。
 */
export function NumberField({
  id,
  value,
  onCommit,
  min,
  max,
  step,
  integer = false,
  fractionDigits,
  className,
}: {
  id?: string;
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** true なら整数に丸める */
  integer?: boolean;
  /** 表示時の小数桁（確定値の表示にのみ適用） */
  fractionDigits?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const scale = fractionDigits != null ? 10 ** fractionDigits : null;
  const shown = scale != null ? Math.round(value * scale) / scale : value;

  const clamp = (n: number) => {
    let next = integer ? Math.round(n) : n;
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    return next;
  };

  return (
    <Input
      id={id}
      type="number"
      inputMode={integer ? "numeric" : "decimal"}
      min={min}
      max={max}
      step={step}
      value={draft ?? String(shown)}
      onChange={(raw) => {
        setDraft(raw);
        const n = Number(raw);
        if (raw.trim() !== "" && Number.isFinite(n)) {
          onCommit(clamp(n));
        }
      }}
      onBlur={() => setDraft(null)}
      className={className}
    />
  );
}
