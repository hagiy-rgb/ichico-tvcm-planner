"use client";

import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GoogleAuthCard() {
  const { data: session, status } = useSession();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Google 連携</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600">
        <p>
          Google Drive 保存には <code className="text-xs">drive.file</code>{" "}
          スコープのみを使用します（アプリが作成したファイルのみアクセス）。
        </p>
        {status === "authenticated" && session?.user ? (
          <p className="text-emerald-800">
            ログイン中: {session.user.email}
          </p>
        ) : (
          <Button
            size="sm"
            onClick={() => signIn("google", { callbackUrl: "/settings" })}
          >
            Googleでログイン
          </Button>
        )}
        <ul className="list-inside list-disc text-xs text-slate-500">
          <li>Cloud Console で OAuth クライアントを作成</li>
          <li>
            リダイレクト URI（開発）: http://localhost:3000/api/auth/callback/google
          </li>
          <li>
            リダイレクト URI（Vercel）: https://（あなたのドメイン）/api/auth/callback/google
          </li>
          <li>.env.local または Vercel の Environment Variables に設定</li>
        </ul>
      </CardContent>
    </Card>
  );
}
