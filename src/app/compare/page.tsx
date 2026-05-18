import { CompareWorkspace } from "@/components/compare/CompareWorkspace";

export default function ComparePage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 pb-12 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">プラン比較</h1>
        <p className="mt-1 text-sm text-slate-600">
          保存済みプランを最大4件まで横並びで比較します。
        </p>
      </div>
      <CompareWorkspace />
    </main>
  );
}
