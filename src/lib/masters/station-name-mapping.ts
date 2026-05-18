import { getStationNameMapping } from "@/lib/masters/load-json";

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
    )
    .replace(/\s+/g, "")
    .replace(/テレビ$/g, "")
    .replace(/放送$/g, "");
}

export function normalizeStationName(
  area: string,
  rawStation: string,
  manualMap?: Record<string, string>,
): string | null {
  const trimmed = rawStation.trim();
  if (!trimmed) {
    return null;
  }

  if (manualMap?.[trimmed]) {
    return manualMap[trimmed];
  }

  const mapping = getStationNameMapping().mappings[area];
  if (!mapping) {
    return null;
  }

  const direct = mapping[trimmed];
  if (direct) {
    return direct;
  }

  const key = normalizeKey(trimmed);
  for (const [alias, canonical] of Object.entries(mapping)) {
    if (alias === "_aliases") {
      continue;
    }
    if (normalizeKey(alias) === key) {
      return canonical;
    }
  }

  return null;
}
