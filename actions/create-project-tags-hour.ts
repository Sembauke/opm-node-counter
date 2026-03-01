'use server'

import { db, getCurrentHourBucket, pruneHourlyStats } from "../lib/db";
import { normalizeCountryCode } from "../lib/country";

const insertProjectTagChangeset = db.prepare(`
  INSERT OR IGNORE INTO project_tag_changesets_hour (bucket_hour, changeset_id, tag)
  VALUES (?, ?, ?)
`);

const upsertProjectTag = db.prepare(`
  INSERT INTO project_tags_hour (bucket_hour, tag, count)
  VALUES (?, ?, ?)
  ON CONFLICT(bucket_hour, tag) DO UPDATE SET count = project_tags_hour.count + excluded.count
`);

const insertAllTimeProjectTagSeen = db.prepare(`
  INSERT OR IGNORE INTO total_project_tag_changeset_seen (changeset_id, tag)
  VALUES (?, ?)
`);

const insertAllTimeProjectTagCountrySeen = db.prepare(`
  INSERT OR IGNORE INTO total_project_tag_country_changeset_seen (changeset_id, tag)
  VALUES (?, ?)
`);

const insertProjectTagChangesetDetail = db.prepare(`
  INSERT OR IGNORE INTO total_project_tag_changesets (
    tag,
    changeset_id,
    user,
    changes,
    created_at,
    center_lat,
    center_lon,
    min_lat,
    min_lon,
    max_lat,
    max_lon
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const upsertAllTimeProjectTagChanges = db.prepare(`
  INSERT INTO total_project_tag_changes (tag, total_changes)
  VALUES (?, ?)
  ON CONFLICT(tag) DO UPDATE SET total_changes = total_project_tag_changes.total_changes + excluded.total_changes
`);

const upsertAllTimeProjectTagCountryChanges = db.prepare(`
  INSERT INTO total_project_tag_country_changes (tag, country_code, total_changes)
  VALUES (?, ?, ?)
  ON CONFLICT(tag, country_code) DO UPDATE SET
    total_changes = total_project_tag_country_changes.total_changes + excluded.total_changes
`);

const selectTopProjectTags = db.prepare(`
  SELECT tag, count
  FROM project_tags_hour
  WHERE bucket_hour = ?
  ORDER BY count DESC, tag ASC
  LIMIT 8
`);

const selectProjectTagCount = db.prepare(`
  SELECT COUNT(*) AS count FROM project_tags_hour WHERE bucket_hour = ?
`);

function extractHashtags(comment: string): string[] {
  const tags = new Set<string>();
  for (const match of comment.matchAll(/#([a-zA-Z][a-zA-Z0-9_-]{1,})/g)) {
    tags.add(match[1].toLowerCase());
  }
  return [...tags];
}

const trackTagsForChangeset = db.transaction(
  (
    bucketHour: number,
    changesetId: number,
    tags: string[],
    changes: number,
    countryCode: string | null,
    user: string | null,
    createdAt: string | null,
    minLat: number | null,
    minLon: number | null,
    maxLat: number | null,
    maxLon: number | null
  ) => {
    const trimmedUser = user?.trim() ?? "";
    const safeUser = trimmedUser.length > 0 ? trimmedUser : "unknown";
    const centerLat =
      minLat !== null && maxLat !== null ? (minLat + maxLat) / 2 : null;
    const centerLon =
      minLon !== null && maxLon !== null ? (minLon + maxLon) / 2 : null;

    for (const tag of tags) {
      const hourlyInsertResult = insertProjectTagChangeset.run(bucketHour, changesetId, tag);
      if (hourlyInsertResult.changes > 0) {
        upsertProjectTag.run(bucketHour, tag, changes);
      }

      const allTimeInsertResult = insertAllTimeProjectTagSeen.run(changesetId, tag);
      if (allTimeInsertResult.changes > 0) {
        upsertAllTimeProjectTagChanges.run(tag, changes);
      }

      if (countryCode) {
        const allTimeCountryInsertResult = insertAllTimeProjectTagCountrySeen.run(changesetId, tag);
        if (allTimeCountryInsertResult.changes > 0) {
          upsertAllTimeProjectTagCountryChanges.run(tag, countryCode, changes);
        }
      }

      insertProjectTagChangesetDetail.run(
        tag,
        changesetId,
        safeUser,
        changes,
        createdAt,
        centerLat,
        centerLon,
        minLat,
        minLon,
        maxLat,
        maxLon
      );
    }
  }
);

function normalizeChanges(changes: number | null) {
  if (changes === null) {
    return 1;
  }

  if (!Number.isFinite(changes)) {
    return 1;
  }

  return Math.max(Math.floor(changes), 0);
}

function normalizeFiniteNumber(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

export async function sendOrGetProjectTagsHour(
  changesetId: number | null = null,
  comment: string | null = null,
  hourOffset: number = 0,
  changes: number | null = null,
  countryCode: string | null = null,
  user: string | null = null,
  createdAt: string | null = null,
  minLat: number | null = null,
  minLon: number | null = null,
  maxLat: number | null = null,
  maxLon: number | null = null
): Promise<{ count: number; topTags: string[] }> {
  const bucketHour = getCurrentHourBucket();
  pruneHourlyStats(bucketHour);
  const targetBucketHour = bucketHour + Math.trunc(hourOffset);
  const normalizedChanges = normalizeChanges(changes);
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const normalizedMinLat = normalizeFiniteNumber(minLat);
  const normalizedMinLon = normalizeFiniteNumber(minLon);
  const normalizedMaxLat = normalizeFiniteNumber(maxLat);
  const normalizedMaxLon = normalizeFiniteNumber(maxLon);

  if (changesetId !== null && comment !== null && hourOffset === 0) {
    const tags = extractHashtags(comment);
    if (tags.length > 0 && normalizedChanges > 0) {
      trackTagsForChangeset(
        bucketHour,
        changesetId,
        tags,
        normalizedChanges,
        normalizedCountryCode,
        user,
        createdAt,
        normalizedMinLat,
        normalizedMinLon,
        normalizedMaxLat,
        normalizedMaxLon
      );
    }
  }

  const countRow = selectProjectTagCount.get(targetBucketHour) as { count: number } | undefined;
  const topRows = selectTopProjectTags.all(targetBucketHour) as Array<{ tag: string; count: number }>;

  return {
    count: countRow?.count ?? 0,
    topTags: topRows.map((r) => r.tag),
  };
}
