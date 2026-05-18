"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { PatternBlock } from "@/types/master";

const WEEKDAY_GROUP_OPTIONS = [
  { value: "WEEKDAY", label: "平日（月〜金）" },
  { value: "WEEKEND", label: "土日" },
  { value: "ALL", label: "全曜日" },
  { value: "月", label: "月曜のみ" },
  { value: "火", label: "火曜のみ" },
  { value: "水", label: "水曜のみ" },
  { value: "木", label: "木曜のみ" },
  { value: "金", label: "金曜のみ" },
  { value: "土", label: "土曜のみ" },
  { value: "日", label: "日曜のみ" },
];

type Props = {
  blocks: PatternBlock[];
  onChange: (blocks: PatternBlock[]) => void;
};

export function PatternBlockList({ blocks, onChange }: Props) {
  const updateBlock = (index: number, block: PatternBlock) => {
    const next = [...blocks];
    next[index] = block;
    onChange(next);
  };

  const addBlock = () => {
    onChange([
      ...blocks,
      {
        weekday_group: "WEEKDAY",
        time_slots: [{ start: "07:00", end: "09:00" }],
      },
    ]);
  };

  const removeBlock = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
  };

  const addTimeSlot = (blockIndex: number) => {
    const block = blocks[blockIndex];
    updateBlock(blockIndex, {
      ...block,
      time_slots: [...block.time_slots, { start: "12:00", end: "13:00" }],
    });
  };

  const removeTimeSlot = (blockIndex: number, slotIndex: number) => {
    const block = blocks[blockIndex];
    if (block.time_slots.length <= 1) {
      return;
    }
    updateBlock(blockIndex, {
      ...block,
      time_slots: block.time_slots.filter((_, i) => i !== slotIndex),
    });
  };

  return (
    <div className="space-y-4">
      {blocks.map((block, blockIndex) => (
        <div
          key={`${block.weekday_group}-${blockIndex}`}
          className="rounded-lg border border-slate-200 bg-slate-50/50 p-3"
        >
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <div className="min-w-[160px] flex-1">
              <Label>曜日グループ</Label>
              <Select
                value={block.weekday_group}
                onChange={(weekday_group) =>
                  updateBlock(blockIndex, { ...block, weekday_group })
                }
                className="mt-1"
              >
                {WEEKDAY_GROUP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => removeBlock(blockIndex)}
              disabled={blocks.length <= 1}
            >
              ブロック削除
            </Button>
          </div>

          <div className="space-y-2">
            {block.time_slots.map((slot, slotIndex) => (
              <div
                key={`${slot.start}-${slotIndex}`}
                className="flex flex-wrap items-end gap-2"
              >
                <div>
                  <Label className="text-xs">開始</Label>
                  <Input
                    value={slot.start}
                    onChange={(start) => {
                      const time_slots = [...block.time_slots];
                      time_slots[slotIndex] = { ...slot, start };
                      updateBlock(blockIndex, { ...block, time_slots });
                    }}
                    className="mt-1 w-24"
                  />
                </div>
                <div>
                  <Label className="text-xs">終了</Label>
                  <Input
                    value={slot.end}
                    onChange={(end) => {
                      const time_slots = [...block.time_slots];
                      time_slots[slotIndex] = { ...slot, end };
                      updateBlock(blockIndex, { ...block, time_slots });
                    }}
                    className="mt-1 w-24"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTimeSlot(blockIndex, slotIndex)}
                >
                  削除
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => addTimeSlot(blockIndex)}
            >
              + 時間帯を追加
            </Button>
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addBlock}>
        + 曜日ブロックを追加
      </Button>
    </div>
  );
}
