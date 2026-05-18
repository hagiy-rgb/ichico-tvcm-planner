import type { PatternPreset } from "@/types/master";
import { getPatternDefinitions } from "./load-json";

export type PatternPresetKey =
  | "全日"
  | "ヨの字"
  | "コの字"
  | "逆L"
  | "一の字"
  | "カスタム";

export function listPatternPresets(): Array<{ key: string; preset: PatternPreset }> {
  const { patterns } = getPatternDefinitions();
  return Object.entries(patterns)
    .filter(([key]) => key !== "カスタム")
    .map(([key, preset]) => ({ key, preset }));
}

export function getPatternPreset(key: string): PatternPreset | undefined {
  return getPatternDefinitions().patterns[key];
}

export function getPatternCoefficient(key: string): number {
  const preset = getPatternPreset(key);
  if (!preset || preset.default_coefficient_vs_average == null) {
    return 1;
  }
  return preset.default_coefficient_vs_average;
}
