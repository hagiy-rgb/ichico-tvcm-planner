import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { savePlanToDrive } from "@/lib/drive/gdrive-store";
import type { SavedPlanRecord } from "@/types/plan";

const bodySchema = z.object({
  id: z.string(),
  meta: z.object({
    name: z.string().min(1),
    clientName: z.string(),
    projectName: z.string(),
    contactPerson: z.string(),
    memo: z.string(),
  }),
  savedAt: z.string(),
  input: z.record(z.unknown()),
  results: z.record(z.unknown()),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Googleアカウントでログインしてください" },
      { status: 401 },
    );
  }

  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "リクエスト形式が不正です" }, { status: 400 });
    }

    const plan = parsed.data as unknown as SavedPlanRecord;
    const result = await savePlanToDrive(session.accessToken, plan);

    return NextResponse.json({
      ok: true,
      driveFileId: result.driveFileId,
      planCount: result.index.plans.length,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Google Driveへの保存に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
