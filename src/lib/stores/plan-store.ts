import { create } from "zustand";
import {
  deleteSavedPlan,
  getComparePlanIds,
  listSavedPlans,
  putSavedPlan,
  setComparePlanIds,
} from "@/lib/db/app-db";
import { runSimulation } from "@/lib/engines/simulation-engine";
import { MAX_COMPARE_PLANS, type SavedPlanMeta, type SavedPlanRecord } from "@/types/plan";
import type { SimulationInput, SimulationResults } from "@/types/simulation";

type PlanState = {
  plans: SavedPlanRecord[];
  compareIds: string[];
  loaded: boolean;
  hydrate: () => Promise<void>;
  savePlan: (
    meta: SavedPlanMeta,
    input: SimulationInput,
    results: SimulationResults,
  ) => Promise<string>;
  removePlan: (id: string) => Promise<void>;
  addToCompare: (planId: string) => Promise<{ ok: boolean; message?: string }>;
  removeFromCompare: (planId: string) => Promise<void>;
  clearCompare: () => Promise<void>;
};

function newPlanId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: [],
  compareIds: [],
  loaded: false,

  hydrate: async () => {
    const [plans, compareIds] = await Promise.all([
      listSavedPlans(),
      getComparePlanIds(),
    ]);
    set({ plans, compareIds, loaded: true });
  },

  savePlan: async (meta, input, results) => {
    const id = newPlanId();
    const record: SavedPlanRecord = {
      id,
      meta,
      savedAt: new Date().toISOString(),
      input,
      results,
    };
    await putSavedPlan(record);
    const plans = await listSavedPlans();
    set({ plans });
    return id;
  },

  removePlan: async (id) => {
    await deleteSavedPlan(id);
    const [plans, compareIds] = await Promise.all([
      listSavedPlans(),
      getComparePlanIds(),
    ]);
    set({ plans, compareIds });
  },

  addToCompare: async (planId) => {
    const { compareIds } = get();
    if (compareIds.includes(planId)) {
      return { ok: true };
    }
    if (compareIds.length >= MAX_COMPARE_PLANS) {
      return {
        ok: false,
        message: `比較は最大${MAX_COMPARE_PLANS}件までです。比較画面で不要なプランを外してください。`,
      };
    }
    const next = [...compareIds, planId];
    await setComparePlanIds(next);
    set({ compareIds: next });
    return { ok: true };
  },

  removeFromCompare: async (planId) => {
    const next = get().compareIds.filter((id) => id !== planId);
    await setComparePlanIds(next);
    set({ compareIds: next });
  },

  clearCompare: async () => {
    await setComparePlanIds([]);
    set({ compareIds: [] });
  },
}));

export function snapshotCurrentPlan(
  meta: Partial<SavedPlanMeta>,
  input: SimulationInput,
  results: SimulationResults | null,
): { meta: SavedPlanMeta; input: SimulationInput; results: SimulationResults } | null {
  if (!results) {
    return null;
  }
  const resolved: SavedPlanMeta = {
    name: meta.name?.trim() || `プラン ${new Date().toLocaleString("ja-JP")}`,
    clientName: meta.clientName?.trim() ?? "",
    projectName: meta.projectName?.trim() ?? "",
    contactPerson: meta.contactPerson?.trim() ?? "",
    memo: meta.memo?.trim() ?? "",
  };
  return { meta: resolved, input, results };
}

export function recalculatePlanResults(
  input: SimulationInput,
): SimulationResults | null {
  try {
    return runSimulation(input);
  } catch {
    return null;
  }
}
