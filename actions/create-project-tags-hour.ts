'use server'

import { db, getCurrentHourBucket, pruneHourlyStats } from "../lib/db";

const insertProjectTagChangeset = db.prepare(`
  INSERT OR IGNORE INTO project_tag_changesets_hour (bucket_hour, changeset_id, tag)
  VALUES (?, ?, ?)
`);

const upsertProjectTag = db.prepare(`
  INSERT INTO project_tags_hour (bucket_hour, tag, count)
  VALUES (?, ?, 1)
  ON CONFLICT(bucket_hour, tag) DO UPDATE SET count = project_tags_hour.count + 1
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
  (bucketHour: number, changesetId: number, tags: string[]) => {
    for (const tag of tags) {
      const result = insertProjectTagChangeset.run(bucketHour, changesetId, tag);
      if (result.changes > 0) {
        upsertProjectTag.run(bucketHour, tag);
      }
    }
  }
);

export async function sendOrGetProjectTagsHour(
  changesetId: number | null = null,
  comment: string | null = null,
  hourOffset: number = 0
): Promise<{ count: number; topTags: string[] }> {
  const bucketHour = getCurrentHourBucket();
  pruneHourlyStats(bucketHour);
  const targetBucketHour = bucketHour + Math.trunc(hourOffset);

  if (changesetId !== null && comment !== null && hourOffset === 0) {
    const tags = extractHashtags(comment);
    if (tags.length > 0) {
      trackTagsForChangeset(bucketHour, changesetId, tags);
    }
  }

  const countRow = selectProjectTagCount.get(targetBucketHour) as { count: number } | undefined;
  const topRows = selectTopProjectTags.all(targetBucketHour) as Array<{ tag: string; count: number }>;

  return {
    count: countRow?.count ?? 0,
    topTags: topRows.map((r) => r.tag),
  };
}
