import { describe, expect, it } from "vitest";
import { buildSimulationCsvRows, serializeSimulationCsv } from "./export";
import { parseSimulationCsv, parseSimulationCsvToInput } from "./csv-import";
import {
  createDefaultInput,
  normalizeSimulationInput,
} from "@/lib/stores/simulation-store";
import { runSimulation } from "@/lib/engines/simulation-engine";
import { getPresetBlocks } from "@/lib/engines/creative-pattern-engine";
import { grpForReachAndAwareness } from "@/lib/engines/cm-length";

describe("simulation CSV export/import", () => {
  it("round-trips input fields through CSV", () => {
    const input = {
      ...createDefaultInput(),
      grp: 250,
      campaignPeriods: 6,
      campaignWeeks: 6,
      selectedStations: ["TBC", "OXTV"],
    };
    const results = runSimulation(input);
    const csv = serializeSimulationCsv(input, results, { planName: "テスト" });
    const { rows } = parseSimulationCsv(csv);
    const restored = parseSimulationCsvToInput(csv);

    expect(restored.area).toBe(input.area);
    expect(restored.grp).toBe(250);
    expect(restored.planningGranularity).toBe("week");
    expect(restored.campaignPeriods).toBe(6);
    expect(restored.campaignWeeks).toBe(6);
    expect(restored.selectedStations).toEqual(["TBC", "OXTV"]);
    expect(restored.coefficients.kPoisson).toBe(input.coefficients.kPoisson);

    const meta = rows.find((r) => r.section === "meta" && r.key === "plan_name");
    expect(meta?.value).toBe("テスト");
  });

  it("restores custom pattern cells from the patternBlocks row", () => {
    const blocks = [
      { weekday_group: "月", time_slots: [{ start: "07:00", end: "09:00" }] },
      {
        weekday_group: "土",
        time_slots: [
          { start: "11:00", end: "13:00" },
          { start: "27:00", end: "29:00" },
        ],
      },
    ];
    const input = {
      ...createDefaultInput(),
      creativePattern: { presetName: "カスタム" as const, blocks },
    };
    const csv = serializeSimulationCsv(input, runSimulation(input));
    const restored = parseSimulationCsvToInput(csv);

    expect(restored.creativePattern.presetName).toBe("カスタム");
    expect(restored.creativePattern.blocks).toEqual(blocks);
  });

  it("falls back to ヨの字 cells for legacy custom CSV without patternBlocks", () => {
    const input = {
      ...createDefaultInput(),
      creativePattern: {
        presetName: "カスタム" as const,
        blocks: [
          { weekday_group: "月", time_slots: [{ start: "07:00", end: "09:00" }] },
        ],
      },
    };
    const csv = serializeSimulationCsv(input, runSimulation(input))
      .split("\n")
      .filter((line) => !line.startsWith("input,patternBlocks,"))
      .join("\n");
    const restored = parseSimulationCsvToInput(csv);

    expect(restored.creativePattern.blocks).toEqual(getPresetBlocks("ヨの字"));
  });

  it("round-trips monthly planning, a manual schedule and station overrides", () => {
    const input = normalizeSimulationInput({
      ...createDefaultInput(),
      grp: 600,
      planningGranularity: "month",
      campaignPeriods: 3,
      manualGrpEnabled: true,
      customPeriodGrp: [300, 200, 100],
      selectedStations: ["TBC", "OXTV"],
      stationPerCosts: { TBC: 52_000 },
      stationDisplayNames: { OXTV: "仙台放送:特番|A,B" },
    });
    const results = runSimulation(input);
    const csv = serializeSimulationCsv(input, results);
    const restored = normalizeSimulationInput(parseSimulationCsvToInput(csv));

    expect(restored.planningGranularity).toBe("month");
    expect(restored.campaignPeriods).toBe(3);
    expect(restored.manualGrpEnabled).toBe(true);
    expect(restored.customPeriodGrp).toEqual([300, 200, 100]);
    expect(restored.stationPerCosts).toEqual({ TBC: 52_000 });
    expect(restored.stationDisplayNames).toEqual({ OXTV: "仙台放送:特番|A,B" });

    const recalculated = runSimulation(restored);
    expect(recalculated.awarenessRate).toBeCloseTo(results.awarenessRate, 10);
    expect(recalculated.totalBudget).toBeCloseTo(results.totalBudget, 6);
  });

  it("exports awareness curve rows per period with effective GRP", () => {
    const input = normalizeSimulationInput({
      ...createDefaultInput(),
      planningGranularity: "month",
      campaignPeriods: 2,
      cmLength: 15,
    });
    const results = runSimulation(input);
    const rows = buildSimulationCsvRows(input, results);
    const curveRows = rows.filter((r) => r.section === "awareness_curve");

    expect(curveRows.map((r) => r.key)).toEqual(["1", "2"]);
    const [grp, effectiveGrp] = curveRows[0].value.split(",").map(Number);
    expect(effectiveGrp).toBeCloseTo(grp * grpForReachAndAwareness(1, 15), 9);
    expect(
      rows.find((r) => r.section === "meta" && r.key === "awareness_curve_period_unit")
        ?.value,
    ).toBe("month");
    expect(rows.find((r) => r.section === "kpi" && r.key === "lambdaPeriod")?.value).toBe(
      String(results.lambdaPeriod),
    );
  });

  it("imports version 1.1 CSV (no period rows) as weekly planning", () => {
    const input = createDefaultInput();
    const csv = serializeSimulationCsv(input, runSimulation(input))
      .split("\n")
      .filter(
        (line) =>
          !/^input,(planningGranularity|campaignPeriods|manualGrpEnabled|customPeriodGrp),/.test(
            line,
          ),
      )
      .map((line) => line.replace(/^meta,format_version,1\.2/, "meta,format_version,1.1"))
      .join("\n");
    const restored = normalizeSimulationInput(parseSimulationCsvToInput(csv));

    expect(restored.planningGranularity).toBe("week");
    expect(restored.campaignPeriods).toBe(input.campaignWeeks);
    expect(restored.manualGrpEnabled).toBe(false);
  });

  it("includes curve sections in export rows", () => {
    const input = createDefaultInput();
    const results = runSimulation(input);
    const rows = buildSimulationCsvRows(input, results);
    expect(rows.some((r) => r.section === "reach_curve")).toBe(true);
    expect(rows.some((r) => r.section === "awareness_curve")).toBe(true);
  });
});
