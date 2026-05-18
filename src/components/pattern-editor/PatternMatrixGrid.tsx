"use client";

import { useMemo } from "react";
import { getPatternDefinitions } from "@/lib/masters/load-json";
import {
  isMinuteInBlocks,
  parseTimeToMinutes,
} from "@/lib/engines/creative-pattern-engine";
import type { PatternBlock } from "@/types/master";

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

type Props = {
  blocks: PatternBlock[];
};

export function PatternMatrixGrid({ blocks }: Props) {
  const zones = useMemo(() => {
    const raw = getPatternDefinitions() as {
      time_zone_master?: {
        zones: Array<{ code: string; label: string; range: string }>;
      };
    };
    return raw.time_zone_master?.zones ?? [];
  }, []);

  const activeByZone = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const zone of zones) {
      const [startLabel, endLabel] = zone.range.split("-");
      const start = parseTimeToMinutes(startLabel);
      const end = parseTimeToMinutes(endLabel);
      const activeDays = new Set<string>();
      for (const day of WEEKDAYS) {
        for (let minute = start; minute < end; minute += 60) {
          if (isMinuteInBlocks(day, minute, blocks)) {
            activeDays.add(day);
            break;
          }
        }
      }
      map.set(zone.code, activeDays);
    }
    return map;
  }, [blocks, zones]);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50">
            <th className="border-b border-r border-slate-200 px-2 py-2 text-left font-medium text-slate-600">
              曜日
            </th>
            {zones.map((zone) => (
              <th
                key={zone.code}
                className="border-b border-slate-200 px-1 py-2 text-center font-medium text-slate-600"
              >
                <span className="block">{zone.label}</span>
                <span className="text-[10px] font-normal text-slate-400">
                  {zone.range}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WEEKDAYS.map((day) => (
            <tr key={day}>
              <td className="border-r border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-700">
                {day}
              </td>
              {zones.map((zone) => {
                const active = activeByZone.get(zone.code)?.has(day);
                return (
                  <td key={zone.code} className="border-slate-100 p-0.5">
                    <div
                      className={`h-7 rounded ${
                        active ? "bg-sky-500 shadow-inner" : "bg-slate-100"
                      }`}
                      title={
                        active
                          ? `${day} ${zone.label} に出稿`
                          : `${day} ${zone.label} は未選択`
                      }
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
