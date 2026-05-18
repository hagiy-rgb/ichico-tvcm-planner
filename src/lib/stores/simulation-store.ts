import { create } from "zustand";
import {
  buildRecommendedCoefficients,
  type FunnelStage,
  type SimulationCoefficients,
} from "@/lib/engines/coefficient-engine";
import {
  detectPresetFromBlocks,
  getPresetBlocks,
} from "@/lib/engines/creative-pattern-engine";
import type { GrpAllocation } from "@/lib/engines/awareness-engine";
import { listStationsForArea } from "@/lib/masters/station-master";
import { runSimulation } from "@/lib/engines/simulation-engine";
import { saveSimulationDraft } from "@/lib/db/app-db";
import { resolveDaypartsDataset } from "@/lib/stores/dayparts-store";
import type { CreativePattern, PatternPresetName } from "@/types/creative-pattern";
import type { PatternBlock } from "@/types/master";
import type { SimulationInput, SimulationResults } from "@/types/simulation";

type SimulationState = {
  input: SimulationInput;
  results: SimulationResults | null;
  setArea: (area: string) => void;
  setTarget: (target: string) => void;
  setIndustryCode: (code: string) => void;
  setFunnelStage: (stage: FunnelStage) => void;
  setCoefficients: (coefficients: Partial<SimulationCoefficients>) => void;
  resetCoefficientsToRecommended: () => void;
  applyPreset: (presetName: PatternPresetName) => void;
  setCreativeBlocks: (blocks: PatternBlock[]) => void;
  setGrp: (grp: number) => void;
  setCampaignWeeks: (weeks: number) => void;
  setGrpAllocation: (allocation: GrpAllocation) => void;
  setSelectedStations: (stations: string[]) => void;
  toggleStation: (station: string) => void;
  setCmLength: (length: 15 | 30 | 60) => void;
  setDaypartsId: (daypartsId: string | null) => void;
  recalculate: () => void;
  loadInput: (input: SimulationInput) => void;
};

function createDefaultCreativePattern(): CreativePattern {
  return {
    presetName: "ヨの字",
    blocks: getPresetBlocks("ヨの字"),
  };
}

export function createDefaultInput(): SimulationInput {
  const creativePattern = createDefaultCreativePattern();
  return {
    area: "宮城",
    target: "個人全体",
    industryCode: "FMCG_FOOD",
    creativePattern,
    funnelStage: "awareness",
    coefficients: buildRecommendedCoefficients("FMCG_FOOD", "awareness"),
    grp: 100,
    campaignWeeks: 4,
    grpAllocation: "even_weekly",
    selectedStations: listStationsForArea("宮城"),
    cmLength: 30,
    daypartsId: null,
  };
}

export function normalizeSimulationInput(
  input: SimulationInput,
): SimulationInput {
  const pattern = input.creativePattern;
  const blocks =
    pattern.blocks?.length > 0
      ? pattern.blocks
      : getPresetBlocks(pattern.presetName ?? "ヨの字");

  return {
    ...input,
    creativePattern: { ...pattern, blocks },
    campaignWeeks: Math.max(1, Math.round(input.campaignWeeks ?? 4)),
    grpAllocation: input.grpAllocation ?? "even_weekly",
    selectedStations:
      input.selectedStations?.length > 0
        ? input.selectedStations
        : listStationsForArea(input.area ?? "宮城"),
    coefficients: {
      ...buildRecommendedCoefficients(
        input.industryCode ?? "FMCG_FOOD",
        input.funnelStage ?? "awareness",
      ),
      ...input.coefficients,
    },
    daypartsId: input.daypartsId ?? null,
  };
}

async function safeRecalculate(
  input: SimulationInput,
): Promise<SimulationResults | null> {
  try {
    const dayparts = await resolveDaypartsDataset(input.daypartsId);
    return runSimulation(input, { dayparts });
  } catch {
    return null;
  }
}

function withRecalc(
  input: SimulationInput,
  set: (partial: Partial<SimulationState>) => void,
): void {
  const normalized = normalizeSimulationInput(input);
  void safeRecalculate(normalized).then((results) => {
    set({ input: normalized, results });
  });
  void saveSimulationDraft(normalized);
}

function syncPatternPreset(
  pattern: CreativePattern,
  blocks: PatternBlock[],
): CreativePattern {
  const presetName = detectPresetFromBlocks(blocks);
  return { presetName, blocks };
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  input: createDefaultInput(),
  results: null,

  setArea: (area) => {
    const input = {
      ...get().input,
      area,
      selectedStations: listStationsForArea(area),
    };
    withRecalc(input, set);
  },
  setTarget: (target) => {
    const input = { ...get().input, target };
    withRecalc(input, set);
  },
  setIndustryCode: (industryCode) => {
    const input = {
      ...get().input,
      industryCode,
      coefficients: buildRecommendedCoefficients(
        industryCode,
        get().input.funnelStage,
      ),
    };
    withRecalc(input, set);
  },
  setFunnelStage: (funnelStage) => {
    const input = {
      ...get().input,
      funnelStage,
      coefficients: buildRecommendedCoefficients(
        get().input.industryCode,
        funnelStage,
      ),
    };
    withRecalc(input, set);
  },
  setCoefficients: (partial) => {
    const input = {
      ...get().input,
      coefficients: { ...get().input.coefficients, ...partial },
    };
    withRecalc(input, set);
  },
  resetCoefficientsToRecommended: () => {
    const { industryCode, funnelStage } = get().input;
    const input = {
      ...get().input,
      coefficients: buildRecommendedCoefficients(industryCode, funnelStage),
    };
    withRecalc(input, set);
  },
  applyPreset: (presetName) => {
    const blocks = getPresetBlocks(presetName);
    const creativePattern: CreativePattern = { presetName, blocks };
    const input = { ...get().input, creativePattern };
    withRecalc(input, set);
  },
  setCreativeBlocks: (blocks) => {
    const creativePattern = syncPatternPreset(
      get().input.creativePattern,
      blocks,
    );
    const input = { ...get().input, creativePattern };
    withRecalc(input, set);
  },
  setGrp: (grp) => {
    const input = { ...get().input, grp: Math.max(0, grp) };
    withRecalc(input, set);
  },
  setCampaignWeeks: (campaignWeeks) => {
    const input = {
      ...get().input,
      campaignWeeks: Math.max(1, Math.round(campaignWeeks)),
    };
    withRecalc(input, set);
  },
  setGrpAllocation: (grpAllocation) => {
    const input = { ...get().input, grpAllocation };
    withRecalc(input, set);
  },
  setSelectedStations: (selectedStations) => {
    const input = { ...get().input, selectedStations };
    withRecalc(input, set);
  },
  toggleStation: (station) => {
    const current = get().input.selectedStations;
    const next = current.includes(station)
      ? current.filter((s) => s !== station)
      : [...current, station];
    if (next.length === 0) {
      return;
    }
    const input = { ...get().input, selectedStations: next };
    withRecalc(input, set);
  },
  setCmLength: (cmLength) => {
    const input = { ...get().input, cmLength };
    withRecalc(input, set);
  },
  setDaypartsId: (daypartsId) => {
    const input = { ...get().input, daypartsId };
    withRecalc(input, set);
  },
  recalculate: () => {
    withRecalc(get().input, set);
  },
  loadInput: (raw) => {
    withRecalc(raw, set);
  },
}));
