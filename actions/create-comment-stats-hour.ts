'use server'

import { db, getCurrentHourBucket, pruneHourlyStats } from "../lib/db";

const PERFECT_COMMENT_LENGTH = 180;
const MIN_SAMPLE_SIZE = 25;
// All-time high stored as integer * 10000 to preserve 4 decimal places.
const ATH_SCALE = 10000;

const insertCommentStat = db.prepare(`
  INSERT OR IGNORE INTO comment_stats_hour (bucket_hour, changeset_id, comment_length)
  VALUES (?, ?, ?)
`);

const selectCommentQuality = db.prepare(`
  SELECT
    COUNT(*) AS total,
    AVG(
      CASE WHEN comment_length >= ${PERFECT_COMMENT_LENGTH}
        THEN 100.0
        ELSE comment_length * 100.0 / ${PERFECT_COMMENT_LENGTH}
      END
    ) AS quality
  FROM comment_stats_hour
  WHERE bucket_hour = ?
`);

const selectAllTimeHigh = db.prepare(`
  SELECT value FROM global_stats WHERE key = 'comment_quality_all_time_high'
`);

const upsertAllTimeHigh = db.prepare(`
  INSERT INTO global_stats (key, value) VALUES ('comment_quality_all_time_high', ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value WHERE excluded.value > value
`);

// Track the last bucket we snapshotted for ATH so we only do it once per hour.
let lastAthSnapshotBucket: number | null = null;

function maybeSnapshotPreviousHourAth(currentBucketHour: number) {
  if (lastAthSnapshotBucket === currentBucketHour) return;
  lastAthSnapshotBucket = currentBucketHour;

  const prevBucket = currentBucketHour - 1;
  const row = selectCommentQuality.get(prevBucket) as { total: number; quality: number | null } | undefined;
  if (!row || row.total < MIN_SAMPLE_SIZE || row.quality == null) return;

  const prevQuality = parseFloat(row.quality.toFixed(4));
  if (prevQuality > 0) {
    upsertAllTimeHigh.run(Math.round(prevQuality * ATH_SCALE));
  }
}

export async function sendOrGetCommentQualityHour(
  changesetId: number | null = null,
  commentLength: number | null = null,
  hourOffset: number = 0
): Promise<number> {
  const bucketHour = getCurrentHourBucket();
  pruneHourlyStats(bucketHour);
  const targetBucketHour = bucketHour + Math.trunc(hourOffset);

  // Snapshot the just-completed hour's quality into the ATH when a new hour starts.
  maybeSnapshotPreviousHourAth(bucketHour);

  if (changesetId !== null && commentLength !== null && hourOffset === 0) {
    insertCommentStat.run(bucketHour, changesetId, Math.max(commentLength, 0));
  }

  const row = selectCommentQuality.get(targetBucketHour) as { total: number; quality: number | null } | undefined;
  if (!row || row.total < MIN_SAMPLE_SIZE || row.quality == null) return 0;

  return parseFloat(row.quality.toFixed(4));
}

export async function sendOrGetCommentQualityAllTimeHigh(): Promise<number> {
  const row = selectAllTimeHigh.get() as { value: number } | undefined;
  if (!row?.value) return 0;
  return parseFloat((row.value / ATH_SCALE).toFixed(4));
}
