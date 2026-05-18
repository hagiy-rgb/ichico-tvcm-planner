import Dexie, { type Table } from "dexie";
import type { DaypartsData } from "@/types/dayparts";
import type { SavedPlanRecord } from "@/types/plan";
import type { SimulationInput } from "@/types/simulation";

export type SimulationDraftRecord = {
  id: string;
  input: SimulationInput;
  updatedAt: string;
};

export type CompareQueueRecord = {
  id: string;
  planIds: string[];
  updatedAt: string;
};

class AppDatabase extends Dexie {
  simulationDrafts!: Table<SimulationDraftRecord, string>;
  savedPlans!: Table<SavedPlanRecord, string>;
  compareQueue!: Table<CompareQueueRecord, string>;
  daypartsDatasets!: Table<DaypartsData, string>;

  constructor() {
    super("ichico-tvcm-planner");
    this.version(1).stores({
      simulationDrafts: "id, updatedAt",
    });
    this.version(2).stores({
      simulationDrafts: "id, updatedAt",
      savedPlans: "id, savedAt, meta.name",
      compareQueue: "id",
    });
    this.version(3).stores({
      simulationDrafts: "id, updatedAt",
      savedPlans: "id, savedAt, meta.name",
      compareQueue: "id",
      daypartsDatasets: "id, area, importedAt",
    });
  }
}

const DRAFT_ID = "current";

let db: AppDatabase | null = null;

function getDb(): AppDatabase | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!db) {
    db = new AppDatabase();
  }
  return db;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function saveSimulationDraft(input: SimulationInput): Promise<void> {
  const database = getDb();
  if (!database) {
    return;
  }

  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(async () => {
    await database.simulationDrafts.put({
      id: DRAFT_ID,
      input,
      updatedAt: new Date().toISOString(),
    });
  }, 400);
}

export async function loadSimulationDraft(): Promise<SimulationInput | null> {
  const database = getDb();
  if (!database) {
    return null;
  }
  const record = await database.simulationDrafts.get(DRAFT_ID);
  return record?.input ?? null;
}

export async function clearSimulationDraft(): Promise<void> {
  const database = getDb();
  if (!database) {
    return;
  }
  await database.simulationDrafts.delete(DRAFT_ID);
}

const COMPARE_QUEUE_ID = "current";

export async function listSavedPlans(): Promise<SavedPlanRecord[]> {
  const database = getDb();
  if (!database) {
    return [];
  }
  return database.savedPlans.orderBy("savedAt").reverse().toArray();
}

export async function getSavedPlan(id: string): Promise<SavedPlanRecord | undefined> {
  const database = getDb();
  if (!database) {
    return undefined;
  }
  return database.savedPlans.get(id);
}

export async function putSavedPlan(record: SavedPlanRecord): Promise<void> {
  const database = getDb();
  if (!database) {
    return;
  }
  await database.savedPlans.put(record);
}

export async function deleteSavedPlan(id: string): Promise<void> {
  const database = getDb();
  if (!database) {
    return;
  }
  await database.savedPlans.delete(id);
  const queue = await database.compareQueue.get(COMPARE_QUEUE_ID);
  if (queue) {
    await database.compareQueue.put({
      ...queue,
      planIds: queue.planIds.filter((pid) => pid !== id),
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function getComparePlanIds(): Promise<string[]> {
  const database = getDb();
  if (!database) {
    return [];
  }
  const queue = await database.compareQueue.get(COMPARE_QUEUE_ID);
  return queue?.planIds ?? [];
}

export async function setComparePlanIds(planIds: string[]): Promise<void> {
  const database = getDb();
  if (!database) {
    return;
  }
  await database.compareQueue.put({
    id: COMPARE_QUEUE_ID,
    planIds,
    updatedAt: new Date().toISOString(),
  });
}

export async function listDaypartsDatasets(): Promise<DaypartsData[]> {
  const database = getDb();
  if (!database) {
    return [];
  }
  return database.daypartsDatasets.orderBy("importedAt").reverse().toArray();
}

export async function getDaypartsDataset(
  id: string,
): Promise<DaypartsData | undefined> {
  const database = getDb();
  if (!database) {
    return undefined;
  }
  return database.daypartsDatasets.get(id);
}

export async function putDaypartsDataset(data: DaypartsData): Promise<void> {
  const database = getDb();
  if (!database) {
    return;
  }
  await database.daypartsDatasets.put(data);
}

export async function deleteDaypartsDataset(id: string): Promise<void> {
  const database = getDb();
  if (!database) {
    return;
  }
  await database.daypartsDatasets.delete(id);
}
