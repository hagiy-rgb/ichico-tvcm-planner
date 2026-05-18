import { cn } from "@/lib/utils/cn";

export function Label({
  htmlFor,
  className,
  children,
}: {
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("text-sm font-medium text-slate-700", className)}
    >
      {children}
    </label>
  );
}
