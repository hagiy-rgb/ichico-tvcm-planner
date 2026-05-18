import { describe, expect, it } from "vitest";
import { buildSimulationCsvRows, serializeSimulationCsv } from "./export";
import { parseSimulationCsv, parseSimulationCsvToInput } from "./csv-import";
import { createDefaultInput } from "@/lib/stores/simulation-store";
import { runSimulation } from "@/lib/engines/simulation-engine";

describe("simulation CSV export/import", () => {
  it("round-trips input fields through CSV", () => {
    const input = {
      ...createDefaultInput(),
      grp: 250,
      campaignWeeks: 6,
      selectedStations: ["TBC", "OXTV"],
    };
    const results = runSimulation(input);
    const csv = serializeSimulationCsv(input, results, { planName: "テスト" });
    const { rows } = parseSimulationCsv(csv);
    const restored = parseSimulationCsvToInput(csv);

    expect(restored.area).toBe(input.area);
    expect(restored.grp).toBe(250);
    expect(restored.campaignWeeks).toBe(6);
    expect(restored.selectedStations).toEqual(["TBC", "OXTV"]);
    expect(restored.coefficients.kPoisson).toBe(input.coefficients.kPoisson);

    const meta = rows.find((r) => r.section === "meta" && r.key === "plan_name");
    expect(meta?.value).toBe("テスト");
  });

  it("includes curve sections in export rows", () => {
    const input = createDefaultInput();
    const results = runSimulation(input);
    const rows = buildSimulationCsvRows(input, results);
    expect(rows.some((r) => r.section === "reach_curve")).toBe(true);
    expect(rows.some((r) => r.section === "awareness_curve")).toBe(true);
  });
});
