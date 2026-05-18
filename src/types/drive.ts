import type { SavedPlanRecord } from "@/types/plan";

export const DRIVE_ROOT_FOLDER_NAME = "ICHICO_TV_Planner";
export const DRIVE_INDEX_FILE = "_index.json";

export type DriveIndexEntry = {
  driveFileId: string;
  planId: string;
  name: string;
  clientName: string;
  projectName: string;
  contactPerson: string;
  savedAt: string;
  area: string;
  grp: number;
  reachRate: number;
  totalBudget: number;
};

export type DriveIndex = {
  version: 1;
  updatedAt: string;
  rootFolderId: string;
  indexFileId: string | null;
  plans: DriveIndexEntry[];
};

export type DrivePlanFile = SavedPlanRecord & {
  driveVersion: 1;
  uploadedAt: string;
};
