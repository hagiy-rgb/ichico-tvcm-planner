"use client";

import { useState } from "react";
import { LogicExplanationDialog } from "@/components/dialogs/LogicExplanationDialog";
import { HelpButton } from "@/components/ui/help-button";
import { PrecisionLabel } from "./PrecisionLabel";
import type { PrecisionLevel } from "@/types/simulation";

export function KpiCard({
  label,
  value,
  sub,
  termId,
  logicId,
  precision = "standard",
}: {
  label: string;
  value: string;
  sub?: string;
  termId?: string;
  logicId?: string;
  precision?: PrecisionLevel;
}) {
  const [logicOpen, setLogicOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          {termId ? <HelpButton termId={termId} /> : null}
        </div>
        <PrecisionLabel level={precision} />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
      {logicId ? (
        <>
          <button
            type="button"
            onClick={() => setLogicOpen(true)}
            className="mt-3 text-xs font-medium text-slate-600 underline-offset-2 hover:underline"
          >
            なぜ？
          </button>
          <LogicExplanationDialog
            logicId={logicId}
            open={logicOpen}
            onClose={() => setLogicOpen(false)}
          />
        </>
      ) : null}
    </div>
  );
}
