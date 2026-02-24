'use server'

import { db, getCurrentHourBucket, pruneHourlyStats } from "../lib/db";

const upsertNewNodes = db.prepare(`
  INSERT INTO new_nodes_hour (bucket_hour, total_new_nodes)
  VALUES (?, ?)
  ON CONFLICT(bucket_hour) DO UPDATE SET
    total_new_nodes = new_nodes_hour.total_new_nodes + excluded.total_new_nodes
`);

const selectNewNodes = db.prepare(`
  SELECT total_new_nodes AS total
  FROM new_nodes_hour
  WHERE bucket_hour = ?
`);

export async function sendOrGetNewNodesHour(
  count: number | null = null,
  hourOffset: number = 0
) {
  const bucketHour = getCurrentHourBucket();
  pruneHourlyStats(bucketHour);
  const targetBucketHour = bucketHour + Math.trunc(hourOffset);

  if (count !== null && count > 0 && hourOffset === 0) {
    upsertNewNodes.run(targetBucketHour, count);
  }

  const row = selectNewNodes.get(targetBucketHour) as { total: number } | undefined;
  return Number(row?.total ?? 0);
}
