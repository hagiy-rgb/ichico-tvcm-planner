import { describe, expect, it } from "vitest";
import {
  cmLengthRatio,
  grpForReachAndAwareness,
  perCostForCmLength,
} from "./cm-length";

describe("cm-length", () => {
  it("uses 15 seconds as baseline for cost", () => {
    expect(cmLengthRatio(15)).toBe(1);
    expect(cmLengthRatio(30)).toBe(2);
    expect(cmLengthRatio(60)).toBe(4);
    expect(perCostForCmLength(10_000, 15)).toBe(10_000);
    expect(perCostForCmLength(10_000, 30)).toBe(20_000);
    expect(perCostForCmLength(10_000, 60)).toBe(40_000);
  });

  it("does not rescale GRP for reach/awareness by CM length", () => {
    expect(grpForReachAndAwareness(100, 15)).toBe(100);
    expect(grpForReachAndAwareness(100, 30)).toBe(100);
    expect(grpForReachAndAwareness(100, 60)).toBe(100);
  });
});
