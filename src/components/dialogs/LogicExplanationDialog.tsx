"use client";

import { LOGIC_EXPLANATIONS } from "@/lib/constants/logic-explanations";

export function LogicExplanationDialog({
  logicId,
  open,
  onClose,
}: {
  logicId: string;
  open: boolean;
  onClose: () => void;
}) {
  const logic = LOGIC_EXPLANATIONS[logicId];
  if (!open || !logic) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logic-dialog-title"
    >
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h3 id="logic-dialog-title" className="text-lg font-bold text-slate-900">
          {logic.title}
        </h3>
        <p className="mt-3 text-sm text-slate-600">{logic.summary}</p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-800">
          {logic.formula}
        </pre>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
          {logic.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
