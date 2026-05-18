"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthButton } from "@/components/auth/AuthButton";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/simulate", label: "シミュレーション" },
  { href: "/plans", label: "プラン一覧" },
  { href: "/compare", label: "比較" },
  { href: "/settings", label: "設定" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-slate-900">
          ICHICO TVCM Planner
        </Link>
        <div className="flex flex-wrap items-center gap-3">
        <nav className="flex flex-wrap gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <AuthButton />
        </div>
      </div>
    </header>
  );
}
