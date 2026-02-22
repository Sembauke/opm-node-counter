'use server'

import { db } from "../lib/db";

const selectChangesetTotal = db.prepare(
  "SELECT value FROM global_stats WHERE key = 'changesets'"
);

const upsertChangesetTotal = db.prepare(`
  INSERT INTO global_stats (key, value)
  VALUES ('changesets', ?)
  ON CONFLICT(key) DO UPDATE SET value =
    CASE
      WHEN excluded.value > global_stats.value THEN excluded.value
      ELSE global_stats.value
    END
`);

export async function sendOrGetChangesetTotal(total: number | null = null) {
  if (total !== null) {
    upsertChangesetTotal.run(total);
  }

  const row = selectChangesetTotal.get() as { value: number } | undefined;
  if (row) {
    return row.value;
  }

  return total ?? 0;
}
