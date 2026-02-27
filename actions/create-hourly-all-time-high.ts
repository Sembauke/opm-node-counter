import { db } from "../lib/db";

export const HOURLY_ALL_TIME_HIGH_KEYS = {
  averageChangesHour: "average_changes_hour_all_time_high",
  uniqueMappersHour: "unique_mappers_hour_all_time_high",
  newNodesHour: "new_nodes_hour_all_time_high",
  activeCountriesHour: "active_countries_hour_all_time_high",
  projectTagsHour: "project_tags_hour_all_time_high",
  topMapperLeaderHour: "top_mapper_leader_hour_all_time_high",
  topCountryLeaderHour: "top_country_leader_hour_all_time_high",
} as const;

const selectHourlyAllTimeHigh = db.prepare(`
  SELECT value
  FROM global_stats
  WHERE key = ?
`);

const upsertHourlyAllTimeHigh = db.prepare(`
  INSERT INTO global_stats (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value WHERE excluded.value > value
`);

function normalizeValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(Math.round(value), 0);
}

export async function sendOrGetHourlyAllTimeHigh(
  key: string,
  value: number | null = null
) {
  const normalizedValue = normalizeValue(value);
  if (normalizedValue !== null) {
    upsertHourlyAllTimeHigh.run(key, normalizedValue);
  }

  const row = selectHourlyAllTimeHigh.get(key) as { value: number } | undefined;
  return Number(row?.value ?? 0);
}
