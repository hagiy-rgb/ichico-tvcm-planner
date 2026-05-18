import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { MainNav } from "@/components/layout/MainNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "ICHICO TVCM Planner",
  description: "テレビCM出稿シミュレーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <AuthProvider>
          <MainNav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
