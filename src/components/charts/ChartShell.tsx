"use client";

import { useEffect, useState, type ReactElement } from "react";
import { ResponsiveContainer } from "recharts";
import { CHART_HEIGHT_PX } from "@/lib/constants/chart-layout";

type Props = {
  children: ReactElement;
  /** グラフの高さ（px）。コンパクト表示（比較画面など）で上書きする */
  height?: number;
};

/**
 * Recharts は SSR 直後や親高さ未確定時に 0px で描画されることがあるため、
 * クライアントマウント後に固定ピクセル高さで描画する。
 */
export function ChartShell({ children, height = CHART_HEIGHT_PX }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div className="w-full" style={{ minHeight: height, height }}>
      {ready ? (
        <ResponsiveContainer width="100%" height={height}>
          {children}
        </ResponsiveContainer>
      ) : (
        <div
          className="w-full animate-pulse rounded-lg bg-slate-100"
          style={{ height }}
          aria-hidden
        />
      )}
    </div>
  );
}
