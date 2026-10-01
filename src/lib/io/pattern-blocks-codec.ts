import type { PatternBlock, PatternTimeSlot } from "@/types/master";

const TIME_PATTERN = /^\d{2}:\d{2}$/;

/**
 * 絵柄ブロックをCSVの1セルに収める文字列へ変換する。
 * 形式: "曜日グループ@開始-終了+開始-終了|曜日グループ@..."（例: "月@07:00-09:00+17:00-24:00|土@11:00-17:00"）
 */
export function encodePatternBlocks(blocks: PatternBlock[]): string {
  return blocks
    .map(
      (block) =>
        `${block.weekday_group}@${block.time_slots
          .map((slot) => `${slot.start}-${slot.end}`)
          .join("+")}`,
    )
    .join("|");
}

/** encodePatternBlocks の逆変換。形式不正なら null（空文字は「枠なし」の空配列） */
export function decodePatternBlocks(value: string): PatternBlock[] | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return [];
  }

  const blocks: PatternBlock[] = [];
  for (const part of trimmed.split("|")) {
    const [group, slotsRaw, ...rest] = part.split("@");
    if (!group || !slotsRaw || rest.length > 0) {
      return null;
    }
    const timeSlots: PatternTimeSlot[] = [];
    for (const slot of slotsRaw.split("+")) {
      const [start, end, ...extra] = slot.split("-");
      if (
        extra.length > 0 ||
        !TIME_PATTERN.test(start ?? "") ||
        !TIME_PATTERN.test(end ?? "")
      ) {
        return null;
      }
      timeSlots.push({ start, end });
    }
    blocks.push({ weekday_group: group, time_slots: timeSlots });
  }
  return blocks;
}
