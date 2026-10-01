"use client";

import { useEffect } from "react";
import { loadSimulationDraft } from "@/lib/db/app-db";
import { useDaypartsStore } from "@/lib/stores/dayparts-store";
import { useSimulationStore } from "@/lib/stores/simulation-store";

/** 起動時に IndexedDB から直近の入力ドラフトを復元 */
export function SimulationDraftHydrator() {
  const hydrateDraft = useSimulationStore((s) => s.hydrateDraft);
  const recalculate = useSimulationStore((s) => s.recalculate);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await useDaypartsStore.getState().hydrate();
        const draft = await loadSimulationDraft();
        if (cancelled) return;
        hydrateDraft(draft);
      } catch {
        if (cancelled) return;
        // ドラフト復元失敗時も既定条件で計算を走らせる
        hydrateDraft(null);
      }
      // hydrate が userEdited でスキップされた場合でも結果が無ければ再計算
      if (!cancelled) {
        const { results, isCalculating } = useSimulationStore.getState();
        if (!results && !isCalculating) {
          recalculate();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateDraft, recalculate]);

  return null;
}
