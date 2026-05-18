"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpButton } from "@/components/ui/help-button";
import { Button } from "@/components/ui/button";
import { listStationsForArea } from "@/lib/masters/station-master";
import { useSimulationStore } from "@/lib/stores/simulation-store";

export function StationSelector() {
  const input = useSimulationStore((s) => s.input);
  const toggleStation = useSimulationStore((s) => s.toggleStation);
  const setSelectedStations = useSimulationStore((s) => s.setSelectedStations);

  const stations = useMemo(
    () => listStationsForArea(input.area),
    [input.area],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>放送局選定</CardTitle>
          <HelpButton termId="station" />
        </div>
        <p className="text-sm text-slate-600">
          選択した局のリーチを Sainsbury 式で合成します（局間相関 ρ はマスタ既定値）。
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {stations.map((station) => {
            const active = input.selectedStations.includes(station);
            return (
              <Button
                key={station}
                size="sm"
                variant={active ? "default" : "outline"}
                onClick={() => toggleStation(station)}
              >
                {station}
              </Button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedStations(stations)}
          >
            全局選択
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          選択 {input.selectedStations.length} / {stations.length} 局
        </p>
      </CardContent>
    </Card>
  );
}
