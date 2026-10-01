import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { grpScheduleSum } from "@/lib/engines/grp-schedule";
import {
  createDefaultInput,
  normalizeSimulationInput,
  useSimulationStore,
} from "./simulation-store";
import type { SimulationInput } from "@/types/simulation";

function legacyInput(overrides: Partial<SimulationInput>): SimulationInput {
  const input: SimulationInput = { ...createDefaultInput(), ...overrides };
  delete input.planningGranularity;
  delete input.campaignPeriods;
  delete input.customPeriodGrp;
  return { ...input, ...overrides };
}

describe("normalizeSimulationInput period planning", () => {
  it("migrates legacy weekly inputs (campaignWeeks / customWeeklyGrp)", () => {
    const normalized = normalizeSimulationInput(
      legacyInput({
        grp: 350,
        campaignWeeks: 8,
        manualGrpEnabled: true,
        customWeeklyGrp: [100, 100, 50, 50, 25, 25, 0, 0],
      }),
    );

    expect(normalized.planningGranularity).toBe("week");
    expect(normalized.campaignPeriods).toBe(8);
    expect(normalized.campaignWeeks).toBe(8);
    expect(normalized.customPeriodGrp).toEqual([100, 100, 50, 50, 25, 25, 0, 0]);
    expect(normalized.customWeeklyGrp).toBeUndefined();
  });

  it("rescales a manual schedule whose total differs from GRP", () => {
    const normalized = normalizeSimulationInput({
      ...createDefaultInput(),
      grp: 400,
      campaignPeriods: 2,
      manualGrpEnabled: true,
      customPeriodGrp: [100, 100],
    });
    expect(normalized.customPeriodGrp).toEqual([200, 200]);
  });

  it("resamples a manual schedule whose length differs from the period count", () => {
    const normalized = normalizeSimulationInput({
      ...createDefaultInput(),
      grp: 600,
      campaignPeriods: 6,
      manualGrpEnabled: true,
      customPeriodGrp: [300, 200, 100],
    });
    const expected = [150, 150, 100, 100, 50, 50];
    expect(normalized.customPeriodGrp).toHaveLength(expected.length);
    expected.forEach((value, index) => {
      expect(normalized.customPeriodGrp?.[index]).toBeCloseTo(value, 9);
    });
  });

  it("clamps monthly periods and derives the compatible week count", () => {
    const normalized = normalizeSimulationInput({
      ...createDefaultInput(),
      planningGranularity: "month",
      campaignPeriods: 30,
    });
    expect(normalized.campaignPeriods).toBe(24);
    expect(normalized.campaignWeeks).toBe(104);
    expect(normalized.customPeriodGrp).toBeNull();
  });
});

describe("simulation store period actions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSimulationStore.setState({
      input: normalizeSimulationInput({
        ...createDefaultInput(),
        grp: 1300,
        campaignPeriods: 13,
      }),
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("converts the period count when switching between weekly and monthly", () => {
    const { setPlanningGranularity } = useSimulationStore.getState();

    setPlanningGranularity("month");
    let input = useSimulationStore.getState().input;
    expect(input.planningGranularity).toBe("month");
    expect(input.campaignPeriods).toBe(3);
    expect(input.campaignWeeks).toBe(13);

    setPlanningGranularity("week");
    input = useSimulationStore.getState().input;
    expect(input.planningGranularity).toBe("week");
    expect(input.campaignPeriods).toBe(13);
  });

  it("keeps GRP as the single total while editing the manual schedule", () => {
    const store = useSimulationStore.getState();
    store.setPlanningGranularity("month");
    store.setCustomPeriodGrp([500, 300, 200]);

    let input = useSimulationStore.getState().input;
    expect(input.manualGrpEnabled).toBe(true);
    expect(input.grp).toBe(1000);
    expect(input.customPeriodGrp).toEqual([500, 300, 200]);

    useSimulationStore.getState().setGrp(2000);
    input = useSimulationStore.getState().input;
    expect(input.customPeriodGrp).toEqual([1000, 600, 400]);

    useSimulationStore.getState().setCampaignPeriods(6);
    input = useSimulationStore.getState().input;
    expect(input.customPeriodGrp).toHaveLength(6);
    expect(grpScheduleSum(input.customPeriodGrp ?? [])).toBeCloseTo(2000, 9);
    expect(input.customPeriodGrp?.[0]).toBeCloseTo(500, 9);
  });
});
