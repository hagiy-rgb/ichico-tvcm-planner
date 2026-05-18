"use client";

import { useEffect } from "react";
import { loadSimulationDraft } from "@/lib/db/app-db";
import { runSimulation } from "@/lib/engines/simulation-engine";
import {
  resolveDaypartsDataset,
  useDaypartsStore,
} from "@/lib/stores/dayparts-store";
import {
  createDefaultInput,
  normalizeSimulationInput,
  useSimulationStore,
} from "@/lib/stores/simulation-store";

/** 起動時に IndexedDB から直近の入力ドラフトを復元 */
export function SimulationDraftHydrator() {
  useEffect(() => {
    void (async () => {
      await useDaypartsStore.getState().hydrate();
      const draft = await loadSimulationDraft();
      const input = normalizeSimulationInput(draft ?? createDefaultInput());
      let results = null;
      try {
        const dayparts = await resolveDaypartsDataset(input.daypartsId);
        results = runSimulation(input, { dayparts });
      } catch {
        results = null;
      }
      useSimulationStore.setState({ input, results });
    })();
  }, []);

  return null;
}
