import { DrivePlansPanel } from "@/components/plans/DrivePlansPanel";
import { PlansList } from "@/components/plans/PlansList";

export default function PlansPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 pb-12 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">プラン一覧</h1>
        <p className="mt-1 text-sm text-slate-600">
          保存したシミュレーション結果の検索・編集・比較・CSV出力ができます。
        </p>
      </div>
      <DrivePlansPanel />
      <PlansList />
    </main>
  );
}
