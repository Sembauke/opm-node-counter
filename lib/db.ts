import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const HOURLY_RETENTION_BUCKETS = 25;

function getDatabasePath() {
  const configuredPath = process.env.SQLITE_PATH;
  if (configuredPath) {
    return path.resolve(process.cwd(), configuredPath);
  }
  return path.join(process.cwd(), "data", "stats.db");
}

function createDatabase() {
  const databasePath = getDatabasePath();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS global_stats (
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS unique_mappers_hour (
      bucket_hour INTEGER NOT NULL,
      user TEXT NOT NULL,
      PRIMARY KEY (bucket_hour, user)
    );

    CREATE TABLE IF NOT EXISTS top_mapper_changesets_hour (
      bucket_hour INTEGER NOT NULL,
      user TEXT NOT NULL,
      changeset_id INTEGER NOT NULL,
      PRIMARY KEY (bucket_hour, user, changeset_id)
    );

    CREATE TABLE IF NOT EXISTS top_mappers_hour (
      bucket_hour INTEGER NOT NULL,
      user TEXT NOT NULL,
      total_changes INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (bucket_hour, user)
    );

    CREATE TABLE IF NOT EXISTS average_changes_hour (
      bucket_hour INTEGER PRIMARY KEY,
      total_changes INTEGER NOT NULL DEFAULT 0,
      count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS largest_changeset_hour (
      bucket_hour INTEGER PRIMARY KEY,
      largest_changes INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS new_nodes_hour (
      bucket_hour INTEGER PRIMARY KEY,
      total_new_nodes INTEGER NOT NULL DEFAULT 0
    );
  `);

  return sqlite;
}

const globalForDb = globalThis as typeof globalThis & {
  __statsDb?: Database.Database;
};

export const db = globalForDb.__statsDb ?? createDatabase();
let lastPrunedBucket: number | null = null;

if (process.env.NODE_ENV !== "production") {
  globalForDb.__statsDb = db;
}

export function getCurrentHourBucket(date = new Date()) {
  return Math.floor(date.getTime() / (60 * 60 * 1000));
}

export function pruneHourlyStats(bucketHour = getCurrentHourBucket()) {
  if (lastPrunedBucket === bucketHour) {
    return;
  }

  const cutoff = bucketHour - HOURLY_RETENTION_BUCKETS;
  db.prepare("DELETE FROM unique_mappers_hour WHERE bucket_hour < ?").run(cutoff);
  db.prepare("DELETE FROM top_mapper_changesets_hour WHERE bucket_hour < ?").run(cutoff);
  db.prepare("DELETE FROM top_mappers_hour WHERE bucket_hour < ?").run(cutoff);
  db.prepare("DELETE FROM average_changes_hour WHERE bucket_hour < ?").run(cutoff);
  db.prepare("DELETE FROM largest_changeset_hour WHERE bucket_hour < ?").run(cutoff);
  db.prepare("DELETE FROM new_nodes_hour WHERE bucket_hour < ?").run(cutoff);
  lastPrunedBucket = bucketHour;
}

export function resetAllStats() {
  db.exec(`
    DELETE FROM global_stats;
    DELETE FROM unique_mappers_hour;
    DELETE FROM top_mapper_changesets_hour;
    DELETE FROM top_mappers_hour;
    DELETE FROM average_changes_hour;
    DELETE FROM largest_changeset_hour;
    DELETE FROM new_nodes_hour;
  `);
  lastPrunedBucket = null;
}
