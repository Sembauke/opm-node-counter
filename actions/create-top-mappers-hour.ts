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

const insertAllTimeMapperSeen = db.prepare(`
  INSERT OR IGNORE INTO total_mapper_changeset_seen (changeset_id)
  VALUES (?)
`);

const upsertAllTimeMapperChanges = db.prepare(`
  INSERT INTO total_mapper_changes (user, total_changes)
  VALUES (?, ?)
  ON CONFLICT(user) DO UPDATE SET
    total_changes = total_mapper_changes.total_changes + excluded.total_changes
`);

const insertAllTimeMapperCountrySeen = db.prepare(`
  INSERT OR IGNORE INTO total_mapper_country_changeset_seen (changeset_id, user)
  VALUES (?, ?)
`);

const upsertAllTimeMapperCountryChanges = db.prepare(`
  INSERT INTO total_mapper_country_changes (user, country_code, total_changes)
  VALUES (?, ?, ?)
  ON CONFLICT(user, country_code) DO UPDATE SET
    total_changes = total_mapper_country_changes.total_changes + excluded.total_changes
`);

const selectTopMappers = db.prepare(`
  SELECT
    top.user AS user,
    top.total_changes AS count,
    (
      SELECT country_code
      FROM total_mapper_country_changes
      WHERE user = top.user
      ORDER BY total_changes DESC, country_code ASC
      LIMIT 1
    ) AS countryCode
  FROM top_mappers_hour AS top
  WHERE bucket_hour = ?
  ORDER BY top.total_changes DESC, top.user ASC
  LIMIT 18
`);

function normalizeCountryCode(countryCode: string | null) {
  if (!countryCode) {
    return null;
  }

  const normalized = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

const trackTopMapperForChangeset = db.transaction(
  (
    bucketHour: number,
    user: string,
    changes: number,
    changesetId: number,
    countryCode: string | null
  ) => {
    const insertResult = insertChangesetForUser.run(bucketHour, user, changesetId);
    if (insertResult.changes > 0) {
      upsertTopMapper.run(bucketHour, user, changes);
    }

    const allTimeMapperInsertResult = insertAllTimeMapperSeen.run(changesetId);
    if (allTimeMapperInsertResult.changes > 0) {
      upsertAllTimeMapperChanges.run(user, changes);
    }

    if (!countryCode) {
      return;
    }

    const allTimeInsertResult = insertAllTimeMapperCountrySeen.run(changesetId, user);
    if (allTimeInsertResult.changes > 0) {
      upsertAllTimeMapperCountryChanges.run(user, countryCode, changes);
    }
  }
);

export async function sendOrGetTopMappersHour(
  user: string | null = null,
  changes: number = 1,
  changesetId: number | null = null,
  hourOffset: number = 0,
  countryCode: string | null = null
) {
  const bucketHour = getCurrentHourBucket();
  pruneHourlyStats(bucketHour);
  const targetBucketHour = bucketHour + Math.trunc(hourOffset);
  const normalizedCountryCode = normalizeCountryCode(countryCode);

  if (user && changesetId !== null && hourOffset === 0) {
    trackTopMapperForChangeset(
      targetBucketHour,
      user,
      changes,
      changesetId,
      normalizedCountryCode
    );
  }

  const rows = selectTopMappers.all(targetBucketHour) as Array<{
    user: string;
    count: number;
    countryCode: string | null;
  }>;
  return rows.map((row) => ({
    user: row.user,
    count: Number(row.count),
    countryCode: row.countryCode ?? null,
  }));
}
