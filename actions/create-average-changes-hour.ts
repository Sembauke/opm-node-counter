'use server'

import { db, getCurrentHourBucket, pruneHourlyStats } from "../lib/db";

const upsertAverageChanges = db.prepare(`
  INSERT INTO average_changes_hour (bucket_hour, total_changes, count)
  VALUES (?, ?, 1)
  ON CONFLICT(bucket_hour) DO UPDATE SET
    total_changes = average_changes_hour.total_changes + excluded.total_changes,
    count = average_changes_hour.count + 1
`);

const selectAverageChanges = db.prepare(`
  SELECT total_changes AS total, count
  FROM average_changes_hour
  WHERE bucket_hour = ?
`);

export async function sendOrGetAverageChangesHour(user: string | null = null, changesCount: number | null = null) {
  const bucketHour = getCurrentHourBucket();
  pruneHourlyStats(bucketHour);

  if (user && changesCount !== null) {
    upsertAverageChanges.run(bucketHour, changesCount);
  }

  const row = selectAverageChanges.get(bucketHour) as { total: number; count: number } | undefined;
  if (!row || row.count === 0) {
    return 0;
  }

  return Math.round(Number(row.total) / Number(row.count));
}
