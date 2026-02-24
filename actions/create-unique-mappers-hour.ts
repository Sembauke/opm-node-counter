'use server'

import { db, getCurrentHourBucket, pruneHourlyStats } from "../lib/db";

const insertUniqueMapper = db.prepare(`
  INSERT OR IGNORE INTO unique_mappers_hour (bucket_hour, user)
  VALUES (?, ?)
`);

const selectUniqueMapperCount = db.prepare(`
  SELECT COUNT(*) AS count
  FROM unique_mappers_hour
  WHERE bucket_hour = ?
`);

export async function sendOrGetUniqueMappersHour(
  user: string | null = null,
  hourOffset: number = 0
) {
  const bucketHour = getCurrentHourBucket();
  pruneHourlyStats(bucketHour);
  const targetBucketHour = bucketHour + Math.trunc(hourOffset);

  if (user && hourOffset === 0) {
    insertUniqueMapper.run(targetBucketHour, user);
  }

  const row = selectUniqueMapperCount.get(targetBucketHour) as { count: number } | undefined;
  return row?.count ?? 0;
}
