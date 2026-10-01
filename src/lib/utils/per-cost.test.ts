import { describe, expect, it } from "vitest";
import { getMasterData } from "@/lib/masters/load-json";
import {
  getStationPerCost,
  resolveStationPerCost,
} from "@/lib/masters/station-master";
import {
  createDefaultInput,
  normalizeSimulationInput,
} from "@/lib/stores/simulation-store";
import {
  normalizePerCostOverrides,
  sanitizePerCostInput,
  toPerCostYen,
} from "./per-cost";

describe("per-cost integer yen", () => {
  it.each([
    ["4500.7", 4501],
    ["4500.4", 4500],
    ["4,500", 4500],
    ["¥4,500円", 4500],
    [" 4500 ", 4500],
    ["４５００", 4500],
    ["４，５００円", 4500],
    ["-3", 0],
    ["", 0],
    ["abc", 0],
  ])("sanitizes %j to %i", (raw, expected) => {
    expect(sanitizePerCostInput(raw)).toBe(expected);
  });

  it("rounds numeric values and clamps negatives / NaN to 0", () => {
    expect(toPerCostYen(3976.5)).toBe(3977);
    expect(toPerCostYen(-10)).toBe(0);
    expect(toPerCostYen(Number.NaN)).toBe(0);
  });

  it("drops non-positive overrides so the master value is used", () => {
    expect(
      normalizePerCostOverrides({ TBC: 4500.6, OX: 0, KHB: -5, MMT: 3000 }),
    ).toEqual({ TBC: 4501, MMT: 3000 });
    expect(
      normalizeSimulationInput({
        ...createDefaultInput(),
        stationPerCosts: { TBC: 1234.5 },
      }).stationPerCosts,
    ).toEqual({ TBC: 1235 });
  });

  it("returns whole yen for every master station cost", () => {
    for (const row of getMasterData().station_cost_master) {
      for (const target of ["個人全体", "世帯"]) {
        for (const pattern of ["全日", "ヨの字", "コの字", "逆L"]) {
          let value: number;
          try {
            value = getStationPerCost(row.area, row.station, pattern, target);
          } catch {
            continue;
          }
          expect(Number.isInteger(value)).toBe(true);
        }
      }
    }
  });

  it("uses an integer override when positive, otherwise the master value", () => {
    const master = getStationPerCost("宮城", "TBC", "ヨの字", "個人全体");
    expect(
      resolveStationPerCost("宮城", "TBC", "ヨの字", "個人全体", { TBC: 4500.2 }),
    ).toBe(4500);
    expect(
      resolveStationPerCost("宮城", "TBC", "ヨの字", "個人全体", { TBC: 0 }),
    ).toBe(master);
  });
});
