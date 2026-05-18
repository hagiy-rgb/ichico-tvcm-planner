const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

type DriveFile = {
  id: string;
  name: string;
  mimeType?: string;
};

export function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function sanitizeDriveSegment(name: string): string {
  const trimmed = name.trim() || "未設定";
  return trimmed.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
}

async function driveFetch(
  accessToken: string,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Drive API error (${response.status}): ${text.slice(0, 200)}`);
  }
  return response;
}

export async function findFileInParent(
  accessToken: string,
  parentId: string,
  fileName: string,
): Promise<DriveFile | null> {
  const q = [
    `name='${escapeDriveQueryValue(fileName)}'`,
    `'${parentId}' in parents`,
    "trashed=false",
  ].join(" and ");

  const url = `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType)&pageSize=1`;
  const response = await driveFetch(accessToken, url);
  const data = (await response.json()) as { files?: DriveFile[] };
  return data.files?.[0] ?? null;
}

export async function createFolder(
  accessToken: string,
  name: string,
  parentId?: string,
): Promise<DriveFile> {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const response = await driveFetch(accessToken, `${DRIVE_API}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
  return (await response.json()) as DriveFile;
}

export async function ensureFolder(
  accessToken: string,
  parentId: string,
  folderName: string,
): Promise<string> {
  const safeName = sanitizeDriveSegment(folderName);
  const existing = await findFileInParent(accessToken, parentId, safeName);
  if (existing) {
    return existing.id;
  }
  const created = await createFolder(accessToken, safeName, parentId);
  return created.id;
}

export async function readJsonFile<T>(
  accessToken: string,
  fileId: string,
): Promise<T | null> {
  const url = `${DRIVE_API}/files/${fileId}?alt=media`;
  const response = await driveFetch(accessToken, url);
  const text = await response.text();
  if (!text) {
    return null;
  }
  return JSON.parse(text) as T;
}

export async function uploadJsonFile(
  accessToken: string,
  parentId: string,
  fileName: string,
  data: unknown,
  existingFileId?: string | null,
): Promise<string> {
  const body = JSON.stringify(data, null, 2);
  const safeName = sanitizeDriveSegment(fileName);

  if (existingFileId) {
    await driveFetch(
      accessToken,
      `${UPLOAD_API}/files/${existingFileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
      },
    );
    return existingFileId;
  }

  const boundary = "ichico_boundary";
  const metadata = JSON.stringify({
    name: safeName.endsWith(".json") ? safeName : `${safeName}.json`,
    parents: [parentId],
    mimeType: "application/json",
  });

  const multipartBody = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    body,
    `--${boundary}--`,
  ].join("\r\n");

  const response = await driveFetch(
    accessToken,
    `${UPLOAD_API}/files?uploadType=multipart`,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    },
  );

  const created = (await response.json()) as DriveFile;
  return created.id;
}

export async function findRootAppFolder(
  accessToken: string,
  folderName: string,
): Promise<DriveFile | null> {
  const q = [
    `name='${escapeDriveQueryValue(folderName)}'`,
    "mimeType='application/vnd.google-apps.folder'",
    "trashed=false",
  ].join(" and ");

  const url = `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=5`;
  const response = await driveFetch(accessToken, url);
  const data = (await response.json()) as { files?: DriveFile[] };
  return data.files?.[0] ?? null;
}
