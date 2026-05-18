import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listDrivePlans } from "@/lib/drive/gdrive-store";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Googleアカウントでログインしてください" },
      { status: 401 },
    );
  }

  try {
    const index = await listDrivePlans(session.accessToken);
    return NextResponse.json(index);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Google Driveの読み込みに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
