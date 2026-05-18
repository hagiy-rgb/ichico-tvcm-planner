import { cn } from "@/lib/utils/cn";

export function Select({
  id,
  value,
  onChange,
  className,
  children,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200",
        className,
      )}
    >
      {children}
    </select>
  );
}
