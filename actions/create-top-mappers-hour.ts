'use server'

import { db, getCurrentHourBucket, pruneHourlyStats } from "../lib/db";

const insertChangesetForUser = db.prepare(`
  INSERT OR IGNORE INTO top_mapper_changesets_hour (bucket_hour, user, changeset_id)
  VALUES (?, ?, ?)
`);

const upsertTopMapper = db.prepare(`
  INSERT INTO top_mappers_hour (bucket_hour, user, total_changes)
  VALUES (?, ?, ?)
  ON CONFLICT(bucket_hour, user) DO UPDATE SET
    total_changes = top_mappers_hour.total_changes + excluded.total_changes
`);

const selectTopMappers = db.prepare(`
  SELECT user, total_changes AS count
  FROM top_mappers_hour
  WHERE bucket_hour = ?
  ORDER BY total_changes DESC, user ASC
  LIMIT 18
`);

const trackTopMapperForChangeset = db.transaction(
  (bucketHour: number, user: string, changes: number, changesetId: number) => {
    const insertResult = insertChangesetForUser.run(bucketHour, user, changesetId);
    if (insertResult.changes > 0) {
      upsertTopMapper.run(bucketHour, user, changes);
    }
  }
);

export async function sendOrGetTopMappersHour(user: string | null = null, changes: number = 1, changesetId: number | null = null) {
  const bucketHour = getCurrentHourBucket();
  pruneHourlyStats(bucketHour);

  if (user && changesetId !== null) {
    trackTopMapperForChangeset(bucketHour, user, changes, changesetId);
  }

  const rows = selectTopMappers.all(bucketHour) as Array<{ user: string; count: number }>;
  return rows.map((row) => ({ user: row.user, count: Number(row.count) }));
}
