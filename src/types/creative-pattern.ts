import type { PatternBlock } from "@/types/master";

export type PatternPresetName =
  | "全日"
  | "ヨの字"
  | "コの字"
  | "逆L"
  | "一の字"
  | "カスタム";

export type CreativePattern = {
  presetName: PatternPresetName;
  blocks: PatternBlock[];
};
