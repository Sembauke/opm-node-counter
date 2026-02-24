'use server'

import { db } from "../lib/db";

const TREND_RETENTION_MS = 2 * 60 * 60 * 1000;
const DEFAULT_TREND_LIMIT = 20000;
const DEFAULT_TREND_WINDOW_MS = 60 * 60 * 1000;

const insertTrendPoint = db.prepare(`
  INSERT INTO nodes_per_minute_trend_points (timestamp_ms, nodes_per_minute)
  VALUES (?, ?)
`);

const pruneTrend = db.prepare(`
  DELETE FROM nodes_per_minute_trend_points
  WHERE timestamp_ms < ?
`);

const selectTrendPoints = db.prepare(`
  SELECT timestamp_ms AS timestamp, nodes_per_minute AS value
  FROM nodes_per_minute_trend_points
  WHERE timestamp_ms >= ?
  ORDER BY timestamp_ms DESC
  LIMIT ?
`);

function clampLimit(limit: number) {
  if (!Number.isFinite(limit) || limit <= 0) {
    return DEFAULT_TREND_LIMIT;
  }
  return Math.min(Math.floor(limit), 20000);
}

function clampWindowMs(windowMs: number) {
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    return DEFAULT_TREND_WINDOW_MS;
  }
  return Math.min(Math.floor(windowMs), TREND_RETENTION_MS);
}

export async function sendOrGetNodesPerMinuteTrend(
  nodesPerMinute: number | null = null,
  timestampMs: number = Date.now(),
  limit: number = DEFAULT_TREND_LIMIT,
  windowMs: number = DEFAULT_TREND_WINDOW_MS
) {
  const now = Number.isFinite(timestampMs) ? Math.floor(timestampMs) : Date.now();
  pruneTrend.run(now - TREND_RETENTION_MS);

  if (nodesPerMinute !== null && nodesPerMinute >= 0) {
    insertTrendPoint.run(now, Math.max(Math.round(nodesPerMinute), 0));
  }

  const cutoffTimestampMs = now - clampWindowMs(windowMs);
  const rows = selectTrendPoints.all(cutoffTimestampMs, clampLimit(limit)) as Array<{
    timestamp: number;
    value: number;
  }>;

  return rows
    .reverse()
    .map((row) => ({ timestamp: Number(row.timestamp), value: Number(row.value) }));
}
