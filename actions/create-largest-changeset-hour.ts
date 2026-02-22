'use server'

import { db, getCurrentHourBucket, pruneHourlyStats } from "../lib/db";

const upsertLargestChangeset = db.prepare(`
  INSERT INTO largest_changeset_hour (bucket_hour, largest_changes)
  VALUES (?, ?)
  ON CONFLICT(bucket_hour) DO UPDATE SET
    largest_changes = CASE
      WHEN excluded.largest_changes > largest_changeset_hour.largest_changes THEN excluded.largest_changes
      ELSE largest_changeset_hour.largest_changes
    END
`);

const selectLargestChangeset = db.prepare(`
  SELECT largest_changes AS value
  FROM largest_changeset_hour
  WHERE bucket_hour = ?
`);

export async function sendOrGetLargestChangesetHour(user: string | null = null, changesCount: number | null = null) {
  const bucketHour = getCurrentHourBucket();
  pruneHourlyStats(bucketHour);

  if (user && changesCount !== null) {
    upsertLargestChangeset.run(bucketHour, changesCount);
  }

  const row = selectLargestChangeset.get(bucketHour) as { value: number } | undefined;
  return Number(row?.value ?? 0);
}
