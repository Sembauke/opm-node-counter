import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const HOURLY_RETENTION_HOURS = 2;
const SCHEMA_SQL = `
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

  CREATE TABLE IF NOT EXISTS top_country_changesets_hour (
    bucket_hour INTEGER NOT NULL,
    changeset_id INTEGER NOT NULL,
    country_code TEXT NOT NULL,
    PRIMARY KEY (bucket_hour, changeset_id)
  );

  CREATE TABLE IF NOT EXISTS top_countries_hour (
    bucket_hour INTEGER NOT NULL,
    country_code TEXT NOT NULL,
    total_changes INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (bucket_hour, country_code)
  );

  CREATE TABLE IF NOT EXISTS changesets_trend (
    bucket_minute INTEGER PRIMARY KEY,
    timestamp_ms INTEGER NOT NULL,
    total_changesets INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS changesets_trend_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp_ms INTEGER NOT NULL,
    total_changesets INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS nodes_per_minute_trend_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp_ms INTEGER NOT NULL,
    nodes_per_minute INTEGER NOT NULL DEFAULT 0
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

  CREATE TABLE IF NOT EXISTS total_country_changeset_seen (
    changeset_id INTEGER PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS total_country_changes (
    country_code TEXT PRIMARY KEY,
    total_changes INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS comment_stats_hour (
    bucket_hour INTEGER NOT NULL,
    changeset_id INTEGER NOT NULL,
    comment_length INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (bucket_hour, changeset_id)
  );

  CREATE TABLE IF NOT EXISTS project_tag_changesets_hour (
    bucket_hour INTEGER NOT NULL,
    changeset_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (bucket_hour, changeset_id, tag)
  );

  CREATE TABLE IF NOT EXISTS project_tags_hour (
    bucket_hour INTEGER NOT NULL,
    tag TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (bucket_hour, tag)
  );
`;

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

  sqlite.exec(SCHEMA_SQL);

  return sqlite;
}

const globalForDb = globalThis as typeof globalThis & {
  __statsDb?: Database.Database;
};

export const db = globalForDb.__statsDb ?? createDatabase();
let lastPrunedBucket: number | null = null;

// Ensure migrations are applied even when reusing a dev-time global database handle.
db.exec(SCHEMA_SQL);

// Migration: replace has_comment column with comment_length in comment_stats_hour.
{
  const cols = (db.pragma("table_info(comment_stats_hour)") as Array<{ name: string }>).map((c) => c.name);
  if (cols.length > 0 && !cols.includes("comment_length")) {
    db.exec(`
      DROP TABLE comment_stats_hour;
      CREATE TABLE comment_stats_hour (
        bucket_hour INTEGER NOT NULL,
        changeset_id INTEGER NOT NULL,
        comment_length INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (bucket_hour, changeset_id)
      );
    `);
  }
}

// Migration: reset quality tables so min-25 logic and 4-decimal precision start clean.
{
  const done = (db.prepare(`SELECT value FROM global_stats WHERE key = 'migration_quality_min25_reset'`).get() as { value: number } | undefined);
  if (!done) {
    db.exec(`
      DELETE FROM comment_stats_hour;
      DELETE FROM project_tag_changesets_hour;
      DELETE FROM project_tags_hour;
      DELETE FROM global_stats WHERE key = 'comment_quality_all_time_high';
    `);
    db.prepare(`INSERT OR REPLACE INTO global_stats (key, value) VALUES ('migration_quality_min25_reset', 1)`).run();
  }
}

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

  const cutoff = bucketHour - HOURLY_RETENTION_HOURS + 1;
  db.prepare("DELETE FROM unique_mappers_hour WHERE bucket_hour < ?").run(cutoff);
  db.prepare("DELETE FROM top_mapper_changesets_hour WHERE bucket_hour < ?").run(cutoff);
  db.prepare("DELETE FROM top_mappers_hour WHERE bucket_hour < ?").run(cutoff);
  db.prepare("DELETE FROM top_country_changesets_hour WHERE bucket_hour < ?").run(cutoff);
  db.prepare("DELETE FROM top_countries_hour WHERE bucket_hour < ?").run(cutoff);
  db.prepare("DELETE FROM average_changes_hour WHERE bucket_hour < ?").run(cutoff);
  db.prepare("DELETE FROM largest_changeset_hour WHERE bucket_hour < ?").run(cutoff);
  db.prepare("DELETE FROM new_nodes_hour WHERE bucket_hour < ?").run(cutoff);
  db.prepare("DELETE FROM comment_stats_hour WHERE bucket_hour < ?").run(cutoff);
  db.prepare("DELETE FROM project_tag_changesets_hour WHERE bucket_hour < ?").run(cutoff);
  db.prepare("DELETE FROM project_tags_hour WHERE bucket_hour < ?").run(cutoff);
  lastPrunedBucket = bucketHour;
}

export function resetAllStats() {
  db.exec(`
    DELETE FROM global_stats;
    DELETE FROM unique_mappers_hour;
    DELETE FROM top_mapper_changesets_hour;
    DELETE FROM top_mappers_hour;
    DELETE FROM top_country_changesets_hour;
    DELETE FROM top_countries_hour;
    DELETE FROM changesets_trend;
    DELETE FROM changesets_trend_points;
    DELETE FROM nodes_per_minute_trend_points;
    DELETE FROM average_changes_hour;
    DELETE FROM largest_changeset_hour;
    DELETE FROM new_nodes_hour;
  `);
  lastPrunedBucket = null;
}
