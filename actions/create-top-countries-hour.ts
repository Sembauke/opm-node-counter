'use server'

import { db, getCurrentHourBucket, pruneHourlyStats } from "../lib/db";
import { isSovereignCountryCode } from "../lib/sovereign-countries";
import { normalizeCountryCode } from "../lib/country";

const insertChangesetForCountry = db.prepare(`
  INSERT OR IGNORE INTO top_country_changesets_hour (bucket_hour, changeset_id, country_code)
  VALUES (?, ?, ?)
`);

const upsertTopCountry = db.prepare(`
  INSERT INTO top_countries_hour (bucket_hour, country_code, total_changes)
  VALUES (?, ?, ?)
  ON CONFLICT(bucket_hour, country_code) DO UPDATE SET
    total_changes = top_countries_hour.total_changes + excluded.total_changes
`);

const insertAllTimeChangeset = db.prepare(`
  INSERT OR IGNORE INTO total_country_changeset_seen (changeset_id) VALUES (?)
`);

const upsertAllTimeCountryChanges = db.prepare(`
  INSERT INTO total_country_changes (country_code, total_changes)
  VALUES (?, ?)
  ON CONFLICT(country_code) DO UPDATE SET
    total_changes = total_country_changes.total_changes + excluded.total_changes
`);

const selectTopCountries = db.prepare(`
  SELECT country_code AS countryCode, total_changes AS count
  FROM top_countries_hour
  WHERE bucket_hour = ?
  ORDER BY total_changes DESC, country_code ASC
`);

const trackTopCountryForChangeset = db.transaction(
  (bucketHour: number, countryCode: string, changes: number, changesetId: number) => {
    const insertResult = insertChangesetForCountry.run(bucketHour, changesetId, countryCode);
    if (insertResult.changes > 0) {
      upsertTopCountry.run(bucketHour, countryCode, changes);
    }

    const allTimeResult = insertAllTimeChangeset.run(changesetId);
    if (allTimeResult.changes > 0) {
      upsertAllTimeCountryChanges.run(countryCode, changes);
    }
  }
);

export async function sendOrGetTopCountriesHour(
  countryCode: string | null = null,
  changes: number = 1,
  changesetId: number | null = null,
  hourOffset: number = 0
) {
  const bucketHour = getCurrentHourBucket();
  pruneHourlyStats(bucketHour);
  const targetBucketHour = bucketHour + Math.trunc(hourOffset);

  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const validSovereignCountryCode =
    normalizedCountryCode && isSovereignCountryCode(normalizedCountryCode)
      ? normalizedCountryCode
      : null;
  if (validSovereignCountryCode && changesetId !== null && hourOffset === 0) {
    trackTopCountryForChangeset(targetBucketHour, validSovereignCountryCode, changes, changesetId);
  }

  const rows = selectTopCountries.all(targetBucketHour) as Array<{ countryCode: string; count: number }>;
  return rows.map((row) => ({
    countryCode: row.countryCode,
    count: Number(row.count),
  }))
    .filter((row) => isSovereignCountryCode(row.countryCode));
}
