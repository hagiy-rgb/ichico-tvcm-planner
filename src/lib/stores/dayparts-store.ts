import { create } from "zustand";
import {
  deleteDaypartsDataset,
  getDaypartsDataset,
  listDaypartsDatasets,
  putDaypartsDataset,
} from "@/lib/db/app-db";
import { parseDaypartsWorkbook } from "@/lib/io/dayparts-import";
import type { DaypartsData } from "@/types/dayparts";

type DaypartsState = {
  datasets: DaypartsData[];
  loaded: boolean;
  hydrate: () => Promise<void>;
  importFile: (
    file: File,
    areaHint: string,
  ) => Promise<{ data: DaypartsData; warnings: string[] }>;
  removeDataset: (id: string) => Promise<void>;
  getById: (id: string | null | undefined) => DaypartsData | null;
  listForArea: (area: string) => DaypartsData[];
};

export const useDaypartsStore = create<DaypartsState>((set, get) => ({
  datasets: [],
  loaded: false,

  hydrate: async () => {
    const datasets = await listDaypartsDatasets();
    set({ datasets, loaded: true });
  },

  importFile: async (file, areaHint) => {
    const buffer = await file.arrayBuffer();
    const { data, warnings } = parseDaypartsWorkbook(buffer, {
      areaHint,
      fileName: file.name,
    });
    await putDaypartsDataset(data);
    const datasets = await listDaypartsDatasets();
    set({ datasets });
    return { data, warnings };
  },

  removeDataset: async (id) => {
    await deleteDaypartsDataset(id);
    const datasets = await listDaypartsDatasets();
    set({ datasets });
  },

  getById: (id) => {
    if (!id) {
      return null;
    }
    return get().datasets.find((d) => d.id === id) ?? null;
  },

  listForArea: (area) =>
    get().datasets.filter((d) => d.area === area || d.area.includes(area)),
}));

export async function resolveDaypartsDataset(
  id: string | null | undefined,
): Promise<DaypartsData | null> {
  if (!id) {
    return null;
  }
  const cached = useDaypartsStore.getState().getById(id);
  if (cached) {
    return cached;
  }
  const fromDb = await getDaypartsDataset(id);
  return fromDb ?? null;
}
