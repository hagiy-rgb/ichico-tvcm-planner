import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadPlanFromDrive } from "@/lib/drive/gdrive-store";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Googleアカウントでログインしてください" },
      { status: 401 },
    );
  }

  const fileId = new URL(request.url).searchParams.get("fileId");
  if (!fileId) {
    return NextResponse.json({ error: "fileId が必要です" }, { status: 400 });
  }

  try {
    const plan = await loadPlanFromDrive(session.accessToken, fileId);
    if (!plan) {
      return NextResponse.json({ error: "プランが見つかりません" }, { status: 404 });
    }
    return NextResponse.json(plan);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Google Driveの読み込みに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
