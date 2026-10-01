import type { ClipboardEvent, HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Input({
  id,
  type = "text",
  value,
  onChange,
  onBlur,
  onPaste,
  min,
  max,
  step,
  inputMode,
  placeholder,
  className,
  invalid,
  describedBy,
}: {
  id?: string;
  type?: string;
  value: number | string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onPaste?: (event: ClipboardEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
  className?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      min={min}
      max={max}
      step={step}
      inputMode={inputMode}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onPaste={onPaste}
      className={cn(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200",
        invalid && "border-rose-400 focus:border-rose-500 focus:ring-rose-100",
        className,
      )}
    />
  );
}
