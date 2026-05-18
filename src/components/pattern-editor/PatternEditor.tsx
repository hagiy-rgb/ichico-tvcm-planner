"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpButton } from "@/components/ui/help-button";
import { Button } from "@/components/ui/button";
import { listPatternPresets } from "@/lib/masters/pattern-master";
import { resolvePatternCoefficient } from "@/lib/engines/creative-pattern-engine";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import type { PatternPresetName } from "@/types/creative-pattern";
import { PatternBlockList } from "./PatternBlockList";
import { PatternMatrixGrid } from "./PatternMatrixGrid";

const PRESET_KEYS: PatternPresetName[] = [
  "全日",
  "ヨの字",
  "コの字",
  "逆L",
  "一の字",
];

export function PatternEditor() {
  const creativePattern = useSimulationStore((s) => s.input.creativePattern);
  const applyPreset = useSimulationStore((s) => s.applyPreset);
  const setCreativeBlocks = useSimulationStore((s) => s.setCreativeBlocks);
  const presets = listPatternPresets();

  const coefficient = resolvePatternCoefficient(
    creativePattern.presetName,
    creativePattern.blocks,
  );

  const activePreset = presets.find(
    (p) => p.key === creativePattern.presetName,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>絵柄（出稿パターン）</CardTitle>
          <HelpButton termId="pattern" />
        </div>
        <p className="text-sm text-slate-600">
          プリセットを選ぶか、曜日グループごとに時間帯を編集できます。編集すると自動で「カスタム」になります。
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {PRESET_KEYS.map((key) => (
            <Button
              key={key}
              size="sm"
              variant={
                creativePattern.presetName === key ? "default" : "outline"
              }
              onClick={() => applyPreset(key)}
            >
              {presets.find((p) => p.key === key)?.preset.label ?? key}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-800">
            現在:{" "}
            {creativePattern.presetName === "カスタム"
              ? "カスタム"
              : (activePreset?.preset.label ?? creativePattern.presetName)}
          </span>
          <span className="text-slate-600">
            絵柄補正係数（k補正）: {coefficient.toFixed(3)}
          </span>
        </div>

        {activePreset?.preset.description && (
          <p className="text-xs text-slate-500">{activePreset.preset.description}</p>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">絵柄マトリクス</p>
          <PatternMatrixGrid blocks={creativePattern.blocks} />
        </div>

        <PatternBlockList
          blocks={creativePattern.blocks}
          onChange={setCreativeBlocks}
        />
      </CardContent>
    </Card>
  );
}
