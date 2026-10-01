"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <span className="text-xs text-slate-400">認証確認中…</span>
    );
  }

  if (session?.error === "RefreshAccessTokenError") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-rose-700">Google連携の期限が切れました</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => signIn("google", { callbackUrl: "/simulate" })}
        >
          再ログイン
        </Button>
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-slate-600 sm:inline">
          {session.user.email}
        </span>
        <Button size="sm" variant="outline" onClick={() => signOut()}>
          ログアウト
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => signIn("google", { callbackUrl: "/simulate" })}
    >
      Googleでログイン
    </Button>
  );
}
