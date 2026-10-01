"use client";

export function AxisModeToggle<T extends string>({
  label,
  mode,
  onChange,
  options,
}: {
  label: string;
  mode: T;
  onChange: (mode: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`rounded-md px-3 py-1.5 transition-colors ${
              mode === option.value
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
