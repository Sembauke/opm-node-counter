'use server'

import { db } from "../lib/db";

const selectNodeTotal = db.prepare(
  "SELECT value FROM global_stats WHERE key = 'nodes'"
);

const upsertNodeTotal = db.prepare(`
  INSERT INTO global_stats (key, value)
  VALUES ('nodes', ?)
  ON CONFLICT(key) DO UPDATE SET value =
    CASE
      WHEN excluded.value > global_stats.value THEN excluded.value
      ELSE global_stats.value
    END
`);

export async function sendOrGetNodeTotal(nodes: number | null = null) {
  if (nodes !== null) {
    upsertNodeTotal.run(nodes);
  }

  const row = selectNodeTotal.get() as { value: number } | undefined;
  if (row) {
    return row.value;
  }

  return nodes ?? 0;
}
