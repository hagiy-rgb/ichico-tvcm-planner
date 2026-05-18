export const DAYPARTS_WEEKDAYS = [
  "月",
  "火",
  "水",
  "木",
  "金",
  "土",
  "日",
] as const;

export type DaypartsWeekday = (typeof DAYPARTS_WEEKDAYS)[number];

export type DaypartsExtraColumn = "平日平均" | "週平均";

export type DaypartsHourRatings = Partial<
  Record<DaypartsWeekday | DaypartsExtraColumn, number>
>;

export type DaypartsStationBlock = {
  station: string;
  stationNormalized: string | null;
  ratings: Record<string, DaypartsHourRatings>;
};

export type DaypartsSheet = {
  target: string;
  blocks: DaypartsStationBlock[];
};

export type DaypartsData = {
  id: string;
  area: string;
  periodStart: string;
  periodEnd: string;
  sampleSize: number;
  timeSlotUnit: number;
  ratingType: string;
  importedAt: string;
  fileName: string;
  sheets: DaypartsSheet[];
  unmappedStations: string[];
};
