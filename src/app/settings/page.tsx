import { CoefficientTuner } from "@/components/coefficient-tuner/CoefficientTuner";
import { PatternEditor } from "@/components/pattern-editor/PatternEditor";
import { GoogleAuthCard } from "@/components/settings/GoogleAuthCard";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 pb-12 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">設定</h1>
        <p className="mt-2 text-sm text-slate-600">
          絵柄定義と業界係数のチューニング。変更はシミュレーション画面と共有され、IndexedDB
          に自動保存されます。
        </p>
      </div>
      <GoogleAuthCard />
      <PatternEditor />
      <CoefficientTuner />
    </main>
  );
}
