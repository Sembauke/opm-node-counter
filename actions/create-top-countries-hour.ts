'use server'

import { db, getCurrentHourBucket, pruneHourlyStats } from "../lib/db";
import { isSovereignCountryCode } from "../lib/sovereign-countries";

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
  }
);

function normalizeCountryCode(countryCode: string | null) {
  if (!countryCode) {
    return null;
  }

  const normalized = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return null;
  }

  if (!isSovereignCountryCode(normalized)) {
    return null;
  }

  return normalized;
}

export async function sendOrGetTopCountriesHour(
  countryCode: string | null = null,
  changes: number = 1,
  changesetId: number | null = null
) {
  const bucketHour = getCurrentHourBucket();
  pruneHourlyStats(bucketHour);

  const normalizedCountryCode = normalizeCountryCode(countryCode);
  if (normalizedCountryCode && changesetId !== null) {
    trackTopCountryForChangeset(bucketHour, normalizedCountryCode, changes, changesetId);
  }

  const rows = selectTopCountries.all(bucketHour) as Array<{ countryCode: string; count: number }>;
  return rows.map((row) => ({
    countryCode: row.countryCode,
    count: Number(row.count),
  }))
    .filter((row) => isSovereignCountryCode(row.countryCode));
}
