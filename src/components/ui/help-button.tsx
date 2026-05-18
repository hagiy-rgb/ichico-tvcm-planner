"use client";

import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { TERM_HELP } from "@/lib/constants/term-help";
import { cn } from "@/lib/utils/cn";

export function HelpButton({
  termId,
  className,
}: {
  termId: keyof typeof TERM_HELP | string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const entry = TERM_HELP[termId];

  if (!entry) {
    return null;
  }

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label={`${entry.term}の説明`}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {open ? (
        <div
          role="tooltip"
          className="absolute left-0 top-6 z-20 w-64 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg"
        >
          <p className="font-semibold text-slate-900">{entry.term}</p>
          <p className="mt-1">{entry.short}</p>
          <p className="mt-2 text-slate-500">{entry.detail}</p>
        </div>
      ) : null}
    </span>
  );
}
