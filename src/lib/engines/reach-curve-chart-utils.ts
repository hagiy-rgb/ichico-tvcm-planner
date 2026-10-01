import type { ReachCurvePoint } from "@/types/simulation";

/** 入力GRPから横軸最大までの余白（300〜500GRP程度） */
export const REACH_CURVE_GRP_HEADROOM = 400;

export function reachCurveGrpMax(
  inputGrp: number,
  headroom = REACH_CURVE_GRP_HEADROOM,
): number {
  return Math.max(0, inputGrp) + headroom;
}

/**
 * リーチ単価（第2軸）の表示域。
 * 低GRP付近のスパイクを除外し、最安値付近がU字として見えるようズームする。
 * 上限は最安の約1.35〜1.8倍に抑え、Excelの「最安地点が判読できる」表示に近づける。
 */
export function reachUnitPriceYDomain(values: number[]): [number, number] {
  const finite = values.filter((v) => Number.isFinite(v) && v > 0);
  if (finite.length === 0) {
    return [0, 100];
  }

  const sorted = [...finite].sort((a, b) => a - b);
  const min = sorted[0];
  // 上位外れ値（低GRPスパイク）を切り、最安付近の帯だけを使う
  const cutoff = Math.max(min * 1.8, sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.35))] ?? min);
  const focus = sorted.filter((v) => v <= cutoff);
  const focusMax = focus[focus.length - 1] ?? min * 1.2;
  const highCandidate = Math.max(focusMax, min * 1.25);
  const span = Math.max(highCandidate - min, min * 0.08, 1);
  const low = Math.max(0, min - span * 0.08);
  const high = highCandidate + span * 0.2;

  if (high <= low) {
    return [0, Math.ceil(min * 1.3) || 10];
  }

  return [Math.floor(low), Math.ceil(high)];
}

export function collectReachUnitPricesForDomain(
  points: ReachCurvePoint[],
): number[] {
  return points
    .filter((p) => p.grp > 0)
    .map((p) => p.reachUnitPrice)
    .filter((v): v is number => v != null && Number.isFinite(v) && v > 0);
}

export type MinReachUnitPricePoint = {
  target: string;
  grp: number;
  reachUnitPrice: number;
};

export function findMinReachUnitPricePoint(
  series: Array<{ target: string; points: ReachCurvePoint[] }>,
): MinReachUnitPricePoint | null {
  let best: MinReachUnitPricePoint | null = null;

  for (const s of series) {
    for (const p of s.points) {
      if (p.grp <= 0) continue;
      if (
        p.reachUnitPrice == null ||
        !Number.isFinite(p.reachUnitPrice) ||
        p.reachUnitPrice <= 0
      ) {
        continue;
      }
      if (!best || p.reachUnitPrice < best.reachUnitPrice) {
        best = {
          target: s.target,
          grp: p.grp,
          reachUnitPrice: p.reachUnitPrice,
        };
      }
    }
  }

  return best;
}
