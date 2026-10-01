import { describe, expect, it } from "vitest";
import {
  cmLengthRatio,
  grpForReachAndAwareness,
  perCostForCmLength,
} from "./cm-length";

describe("cm-length", () => {
  it("uses 30 seconds as baseline", () => {
    expect(cmLengthRatio(30)).toBe(1);
    expect(grpForReachAndAwareness(100, 30)).toBe(100);
    expect(perCostForCmLength(10_000, 30)).toBe(10_000);
  });

  it("scales reach GRP and per-cost for 15s and 60s", () => {
    expect(grpForReachAndAwareness(100, 15)).toBe(200);
    expect(grpForReachAndAwareness(100, 60)).toBe(50);
    expect(perCostForCmLength(10_000, 15)).toBe(5_000);
    expect(perCostForCmLength(10_000, 60)).toBe(20_000);
  });
});
