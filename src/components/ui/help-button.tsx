"use client";

import { HelpCircle } from "lucide-react";
import { TERM_HELP } from "@/lib/constants/term-help";
import { cn } from "@/lib/utils/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function HelpButton({
  termId,
  className,
}: {
  termId: keyof typeof TERM_HELP | string;
  className?: string;
}) {
  const entry = TERM_HELP[termId];
  if (!entry) return null;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${entry.term}の説明`}
          className={cn(
            "rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
            className,
          )}
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="w-64 space-y-1">
        <p className="font-semibold text-slate-900">{entry.term}</p>
        <p>{entry.short}</p>
        <p className="text-slate-500">{entry.detail}</p>
      </TooltipContent>
    </Tooltip>
  );
}
