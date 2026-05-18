import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">ICHICO TVCM Planner</h1>
      <p className="text-center text-slate-600">
        テレビCM出稿プランの試算・比較ツール
      </p>
      <Link
        href="/simulate"
        className="rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800"
      >
        シミュレーションを開始
      </Link>
    </main>
  );
}
