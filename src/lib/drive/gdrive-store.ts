import {
  ensureFolder,
  findFileInParent,
  findRootAppFolder,
  createFolder,
  readJsonFile,
  sanitizeDriveSegment,
  uploadJsonFile,
} from "@/lib/drive/gdrive-client";
import type { SavedPlanRecord } from "@/types/plan";
import {
  DRIVE_INDEX_FILE,
  DRIVE_ROOT_FOLDER_NAME,
  type DriveIndex,
  type DriveIndexEntry,
  type DrivePlanFile,
} from "@/types/drive";

function emptyIndex(rootFolderId: string): DriveIndex {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    rootFolderId,
    indexFileId: null,
    plans: [],
  };
}

function toIndexEntry(
  plan: SavedPlanRecord,
  driveFileId: string,
): DriveIndexEntry {
  return {
    driveFileId,
    planId: plan.id,
    name: plan.meta.name,
    clientName: plan.meta.clientName,
    projectName: plan.meta.projectName,
    contactPerson: plan.meta.contactPerson,
    savedAt: plan.savedAt,
    area: plan.input.area,
    grp: plan.input.grp,
    reachRate: plan.results.reachRate,
    totalBudget: plan.results.totalBudget,
  };
}

export async function ensureDriveRoot(accessToken: string): Promise<DriveIndex> {
  let root = await findRootAppFolder(accessToken, DRIVE_ROOT_FOLDER_NAME);
  if (!root) {
    root = await createFolder(accessToken, DRIVE_ROOT_FOLDER_NAME);
  }

  const indexFile = await findFileInParent(
    accessToken,
    root.id,
    DRIVE_INDEX_FILE,
  );

  if (indexFile) {
    const parsed = await readJsonFile<DriveIndex>(accessToken, indexFile.id);
    if (parsed?.version === 1) {
      return {
        ...parsed,
        rootFolderId: root.id,
        indexFileId: indexFile.id,
      };
    }
  }

  return emptyIndex(root.id);
}

async function persistIndex(
  accessToken: string,
  index: DriveIndex,
): Promise<DriveIndex> {
  const next: DriveIndex = {
    ...index,
    updatedAt: new Date().toISOString(),
  };
  const indexFileId = await uploadJsonFile(
    accessToken,
    index.rootFolderId,
    DRIVE_INDEX_FILE,
    next,
    index.indexFileId,
  );
  return { ...next, indexFileId };
}

export async function savePlanToDrive(
  accessToken: string,
  plan: SavedPlanRecord,
): Promise<{ driveFileId: string; index: DriveIndex }> {
  const index = await ensureDriveRoot(accessToken);

  const clientFolder = await ensureFolder(
    accessToken,
    index.rootFolderId,
    plan.meta.clientName || "未設定企業",
  );
  const projectFolder = await ensureFolder(
    accessToken,
    clientFolder,
    plan.meta.projectName || "未設定案件",
  );

  const fileName = `${sanitizeDriveSegment(plan.meta.name)}.json`;
  const existing = await findFileInParent(accessToken, projectFolder, fileName);

  const payload: DrivePlanFile = {
    ...plan,
    driveVersion: 1,
    uploadedAt: new Date().toISOString(),
  };

  const driveFileId = await uploadJsonFile(
    accessToken,
    projectFolder,
    fileName,
    payload,
    existing?.id,
  );

  const others = index.plans.filter((p) => p.planId !== plan.id);
  const updated = await persistIndex(accessToken, {
    ...index,
    plans: [...others, toIndexEntry(plan, driveFileId)],
  });

  return { driveFileId, index: updated };
}

export async function listDrivePlans(
  accessToken: string,
): Promise<DriveIndex> {
  return ensureDriveRoot(accessToken);
}

export async function loadPlanFromDrive(
  accessToken: string,
  driveFileId: string,
): Promise<DrivePlanFile | null> {
  return readJsonFile<DrivePlanFile>(accessToken, driveFileId);
}
