'use server'

import { db } from "../lib/db";

const TREND_RETENTION_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TREND_LIMIT = 5000;

const insertTrendPoint = db.prepare(`
  INSERT INTO changesets_trend_points (timestamp_ms, total_changesets)
  VALUES (?, ?)
`);

const pruneTrend = db.prepare(`
  DELETE FROM changesets_trend_points
  WHERE timestamp_ms < ?
`);

const selectTrendPoints = db.prepare(`
  SELECT timestamp_ms AS timestamp, total_changesets AS value
  FROM changesets_trend_points
  ORDER BY timestamp_ms DESC
  LIMIT ?
`);

const selectLatestTrendPoint = db.prepare(`
  SELECT timestamp_ms AS timestamp, total_changesets AS value
  FROM changesets_trend_points
  ORDER BY timestamp_ms DESC
  LIMIT 1
`);

function clampLimit(limit: number) {
  if (!Number.isFinite(limit) || limit <= 0) {
    return DEFAULT_TREND_LIMIT;
  }
  return Math.min(Math.floor(limit), 20000);
}

export async function sendOrGetTotalChangesetsTrend(
  totalChangesets: number | null = null,
  timestampMs: number = Date.now(),
  limit: number = DEFAULT_TREND_LIMIT
) {
  const now = Number.isFinite(timestampMs) ? Math.floor(timestampMs) : Date.now();
  pruneTrend.run(now - TREND_RETENTION_MS);

  if (totalChangesets !== null && totalChangesets > 0) {
    const latestPoint = selectLatestTrendPoint.get() as
      | { timestamp: number; value: number }
      | undefined;

    if (!latestPoint || Number(latestPoint.value) !== totalChangesets) {
      insertTrendPoint.run(now, totalChangesets);
    }
  }

  const rows = selectTrendPoints.all(clampLimit(limit)) as Array<{
    timestamp: number;
    value: number;
  }>;

  return rows
    .reverse()
    .map((row) => ({ timestamp: Number(row.timestamp), value: Number(row.value) }));
}
