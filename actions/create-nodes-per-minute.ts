'use server'

import { db } from "../lib/db";

const NODES_PER_MINUTE_KEY = "nodes_per_minute";
const NODES_PER_MINUTE_ALL_TIME_HIGH_KEY = "nodes_per_minute_all_time_high";

const selectGlobalStatByKey = db.prepare(
  "SELECT value FROM global_stats WHERE key = ?"
);

const upsertNodesPerMinute = db.prepare(`
  INSERT INTO global_stats (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);

const upsertNodesPerMinuteAllTimeHigh = db.prepare(`
  INSERT INTO global_stats (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = MAX(global_stats.value, excluded.value)
`);

export async function sendOrGetNodesPerMinute(rate: number | null = null) {
  if (rate !== null) {
    const safeRate = Math.max(Math.round(rate), 0);
    upsertNodesPerMinute.run(NODES_PER_MINUTE_KEY, safeRate);
    upsertNodesPerMinuteAllTimeHigh.run(NODES_PER_MINUTE_ALL_TIME_HIGH_KEY, safeRate);
  }

  const row = selectGlobalStatByKey.get(NODES_PER_MINUTE_KEY) as { value: number } | undefined;
  if (row) {
    return row.value;
  }

  return rate ?? 0;
}

export async function sendOrGetNodesPerMinuteAllTimeHigh() {
  const highRow = selectGlobalStatByKey.get(NODES_PER_MINUTE_ALL_TIME_HIGH_KEY) as
    | { value: number }
    | undefined;
  const currentRow = selectGlobalStatByKey.get(NODES_PER_MINUTE_KEY) as
    | { value: number }
    | undefined;

  const storedHigh = Math.max(Number(highRow?.value ?? 0), 0);
  const currentRate = Math.max(Number(currentRow?.value ?? 0), 0);
  const resolvedHigh = Math.max(storedHigh, currentRate);

  if (resolvedHigh > storedHigh) {
    upsertNodesPerMinuteAllTimeHigh.run(NODES_PER_MINUTE_ALL_TIME_HIGH_KEY, resolvedHigh);
  }

  return resolvedHigh;
}
