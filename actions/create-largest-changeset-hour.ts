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

export async function sendOrGetLargestChangesetHour(
  user: string | null = null,
  changesCount: number | null = null,
  hourOffset: number = 0
) {
  const bucketHour = getCurrentHourBucket();
  pruneHourlyStats(bucketHour);
  const targetBucketHour = bucketHour + Math.trunc(hourOffset);

  if (user && changesCount !== null && hourOffset === 0) {
    upsertLargestChangeset.run(targetBucketHour, changesCount);
  }

  const row = selectLargestChangeset.get(targetBucketHour) as { value: number } | undefined;
  return Number(row?.value ?? 0);
}
