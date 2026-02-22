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

export async function sendOrGetUniqueMappersHour(user: string | null = null) {
  const bucketHour = getCurrentHourBucket();
  pruneHourlyStats(bucketHour);

  if (user) {
    insertUniqueMapper.run(bucketHour, user);
  }

  const row = selectUniqueMapperCount.get(bucketHour) as { count: number } | undefined;
  return row?.count ?? 0;
}
