import { cn } from "@/lib/utils/cn";

export function Input({
  id,
  type = "text",
  value,
  onChange,
  min,
  max,
  step,
  className,
}: {
  id?: string;
  type?: string;
  value: number | string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200",
        className,
      )}
    />
  );
}
