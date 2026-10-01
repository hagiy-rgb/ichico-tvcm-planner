"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpButton } from "@/components/ui/help-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LogicExplanationDialog } from "@/components/dialogs/LogicExplanationDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  areaHasTxSeries,
  getDefaultDisplayName,
  getDefaultPerCost,
  getNetworkLabel,
  isNhkStation,
  listStationNetworkRows,
  NETWORK_SERIES,
} from "@/lib/masters/station-network";
import { listStationsForArea } from "@/lib/masters/station-master";
import {
  DEFAULT_STATION_GRP_ALLOCATION,
  type StationGrpAllocation,
} from "@/lib/engines/station-engine";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { formatNumber } from "@/lib/utils/number-format";
import { PerCostField } from "./PerCostField";

const ALLOCATION_OPTIONS: Array<{
  value: StationGrpAllocation;
  label: string;
  description: string;
}> = [
  {
    value: "cost_weighted",
    label: "コスト加重（既定）",
    description:
      "局パーコストの逆数に比例して配分（単価の安い局＝同じ金額でGRPが取れるため厚く）",
  },
  {
    value: "equal",
    label: "均等",
    description: "選択局へ同じGRPを配分",
  },
  {
    value: "manual",
    label: "手入力（GRP配分比率）",
    description: "各局の配分比率（%）を手入力。合計は自動で正規化します",
  },
];

export function StationSelector() {
  const [logicOpen, setLogicOpen] = useState(false);
  const input = useSimulationStore((s) => s.input);
  const stationRows = useSimulationStore((s) => s.results?.stationReachRows);
  const toggleStation = useSimulationStore((s) => s.toggleStation);
  const setSelectedStations = useSimulationStore((s) => s.setSelectedStations);
  const setStationDisplayName = useSimulationStore((s) => s.setStationDisplayName);
  const setStationPerCost = useSimulationStore((s) => s.setStationPerCost);
  const setStationGrpAllocation = useSimulationStore(
    (s) => s.setStationGrpAllocation,
  );
  const setStationManualGrpShare = useSimulationStore(
    (s) => s.setStationManualGrpShare,
  );
  const setStationSpotUnitPrice = useSimulationStore(
    (s) => s.setStationSpotUnitPrice,
  );
  const applyReachMaxStationAllocation = useSimulationStore(
    (s) => s.applyReachMaxStationAllocation,
  );
  const allocation = input.stationGrpAllocation ?? DEFAULT_STATION_GRP_ALLOCATION;

  const rows = useMemo(
    () => listStationNetworkRows(input.area),
    [input.area],
  );
  const hasTx = areaHasTxSeries(input.area);

  const nhkRows = rows.filter((r) => r.isNhk);
  const seriesRows = NETWORK_SERIES.map((series) => ({
    series,
    stations: rows.filter(
      (r) => !r.isNhk && r.network === series.code,
    ),
  }));

  const allStations = useMemo(
    () => listStationsForArea(input.area),
    [input.area],
  );

  const renderStationRow = (
    station: string,
    network: string,
    disabled?: boolean,
    disabledReason?: string,
  ) => {
    const active = input.selectedStations.includes(station);
    const displayName =
      input.stationDisplayNames?.[station] ??
      getDefaultDisplayName(station);
    const defaultPerCost = getDefaultPerCost(
      input.area,
      station,
      input.target,
      input.creativePattern,
    );
    const grpShare = stationRows?.find((row) => row.station === station)
      ?.grpShare;
    const manualShare =
      input.stationManualGrpShares?.[station] ??
      (grpShare != null ? Math.round(grpShare * 1000) / 10 : 0);
    const spotPrice = input.stationSpotUnitPrices?.[station] ?? 0;

    const label = isNhkStation(station, network)
      ? station
      : getNetworkLabel(network);

    const checkbox = (
      <label
        className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${
          active
            ? "border-slate-900 bg-slate-50"
            : "border-slate-200 bg-white"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <input
          type="checkbox"
          className="mt-1"
          checked={active}
          disabled={disabled}
          onChange={() => !disabled && toggleStation(station)}
        />
        <span className="flex-1 space-y-2">
          <span className="block text-sm font-medium text-slate-900">
            {label}
          </span>
          {active ? (
            <>
              <div>
                <Label className="text-xs text-slate-500">局名</Label>
                <Input
                  value={displayName}
                  placeholder={getDefaultDisplayName(station)}
                  onChange={(v) => setStationDisplayName(station, v)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">
                  パーコスト（円単位の整数）
                </Label>
                <PerCostField
                  override={input.stationPerCosts?.[station]}
                  masterValue={defaultPerCost}
                  onCommit={(yen) => setStationPerCost(station, yen)}
                />
              </div>
              {allocation === "manual" ? (
                <div>
                  <Label className="text-xs text-slate-500">
                    GRP配分比率（%）
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={String(manualShare)}
                    onChange={(v) =>
                      setStationManualGrpShare(station, Number(v) || 0)
                    }
                    className="mt-1"
                  />
                </div>
              ) : null}
              <div>
                <Label className="text-xs text-slate-500">
                  目安1本単価（円・任意）
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={spotPrice > 0 ? String(spotPrice) : ""}
                  placeholder="例: 45000"
                  onChange={(v) =>
                    setStationSpotUnitPrice(station, Number(v) || 0)
                  }
                  className="mt-1"
                />
              </div>
              {grpShare != null ? (
                <p className="text-xs text-slate-500">
                  GRP配分 {(grpShare * 100).toFixed(1)}%（約{" "}
                  {formatNumber(Math.round(input.grp * grpShare))} GRP）
                </p>
              ) : null}
            </>
          ) : null}
        </span>
      </label>
    );

    if (disabled && disabledReason) {
      return (
        <Tooltip key={station}>
          <TooltipTrigger asChild>
            <div>{checkbox}</div>
          </TooltipTrigger>
          <TooltipContent side="top">{disabledReason}</TooltipContent>
        </Tooltip>
      );
    }

    return <div key={station}>{checkbox}</div>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>放送局選定</CardTitle>
          <HelpButton termId="station" />
        </div>
        <p className="text-sm text-slate-600">
          系列単位で選択し、局名・パーコスト（円単位の整数。空欄はマスタ値）・目安1本単価を調整できます。総GRPは下記の方式で局へ按分し、出稿総額は局別GRP×局パーコストの合計です。
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <fieldset className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-xs font-medium text-slate-700">
            局へのGRP按分
          </legend>
          <div className="flex flex-wrap gap-4">
            {ALLOCATION_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 text-sm"
                title={option.description}
              >
                <input
                  type="radio"
                  name="station-grp-allocation"
                  checked={allocation === option.value}
                  onChange={() => setStationGrpAllocation(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {ALLOCATION_OPTIONS.find((o) => o.value === allocation)?.description}
          </p>
        </fieldset>
        <div className="space-y-2">
          {seriesRows.map(({ series, stations }) => {
            if (stations.length === 0) return null;
            const station = stations[0].station;
            const isTx = series.code === "T";
            const disabled = isTx && !hasTx;
            return renderStationRow(
              station,
              series.code,
              disabled,
              disabled ? "このエリアにはTX系列はありません" : undefined,
            );
          })}
          {nhkRows.map((row) =>
            renderStationRow(row.station, "NHK"),
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const selectable = allStations.filter((st) => {
                const r = rows.find((x) => x.station === st);
                if (r?.network === "T" && !hasTx) return false;
                return true;
              });
              setSelectedStations(selectable);
            }}
          >
            全局選択
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyReachMaxStationAllocation("practical")}
              >
                実務寄り最大化
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyReachMaxStationAllocation("theoretical")}
              >
                理論最大
              </Button>
              <HelpButton termId="reachMaxAllocation" />
              <button
                type="button"
                onClick={() => setLogicOpen(true)}
                className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline"
              >
                なぜ？
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          「実務寄り最大化」は総額固定のまま全局に最低配分（均等の半分）を保証し、1局上限（目安40%）内でリーチを最大化します。「理論最大」は制約なしのため少数局に寄りやすいです。
        </p>
        <p className="text-xs text-slate-500">
          選択 {input.selectedStations.length} / {allStations.length} 局
        </p>
        <LogicExplanationDialog
          logicId="reachMaxAllocation"
          open={logicOpen}
          onClose={() => setLogicOpen(false)}
        />
      </CardContent>
    </Card>
  );
}
