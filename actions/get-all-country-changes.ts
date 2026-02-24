'use server'

import { db } from "../lib/db";

const selectAllCountryChanges = db.prepare(`
  SELECT country_code AS countryCode, total_changes AS count
  FROM total_country_changes
  WHERE total_changes > 0
  ORDER BY total_changes DESC, country_code ASC
`);

export async function getAllCountryChanges(): Promise<Array<{ countryCode: string; count: number }>> {
  const rows = selectAllCountryChanges.all() as Array<{ countryCode: string; count: number }>;
  return rows.map((row) => ({
    countryCode: row.countryCode,
    count: Number(row.count),
  }));
}
