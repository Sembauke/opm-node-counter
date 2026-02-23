'use server'

import { db } from "../lib/db";

const selectNodesPerMinute = db.prepare(
  "SELECT value FROM global_stats WHERE key = 'nodes_per_minute'"
);

const upsertNodesPerMinute = db.prepare(`
  INSERT INTO global_stats (key, value)
  VALUES ('nodes_per_minute', ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);

export async function sendOrGetNodesPerMinute(rate: number | null = null) {
  if (rate !== null) {
    upsertNodesPerMinute.run(Math.max(Math.round(rate), 0));
  }

  const row = selectNodesPerMinute.get() as { value: number } | undefined;
  if (row) {
    return row.value;
  }

  return rate ?? 0;
}
