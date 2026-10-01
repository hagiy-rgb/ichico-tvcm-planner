import type { PrecisionLevel } from "@/types/simulation";
import { cn } from "@/lib/utils/cn";

const LABELS: Record<
  PrecisionLevel,
  { text: string; hint: string; className: string }
> = {
  standard: {
    text: "標準精度",
    hint: "誤差±20〜30%目安",
    className: "bg-slate-100 text-slate-700",
  },
  high: {
    text: "高精度",
    hint: "誤差±10〜15%目安",
    className: "bg-blue-100 text-blue-800",
  },
  verified: {
    text: "実勢値",
    hint: "誤差±5〜10%目安",
    className: "bg-emerald-100 text-emerald-800",
  },
};

export function PrecisionLabel({ level }: { level: PrecisionLevel }) {
  // サマリーで「標準精度」はノイズになるため非表示。高精度・実勢値のみ表示
  if (level === "standard") {
    return null;
  }
  const config = LABELS[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        config.className,
      )}
      title={config.hint}
    >
      {config.text}
    </span>
  );
}
