'use server'

import { db } from "@/lib/db";

const selectAllMapperChanges = db.prepare(`
  SELECT
    totals.user AS user,
    totals.total_changes AS count,
    (
      SELECT country_code
      FROM total_mapper_country_changes
      WHERE user = totals.user
      ORDER BY total_changes DESC, country_code ASC
      LIMIT 1
    ) AS countryCode
  FROM total_mapper_changes AS totals
  WHERE totals.total_changes > 0
  ORDER BY totals.total_changes DESC, totals.user ASC
`);

export async function getAllMapperChanges(): Promise<Array<{
  user: string;
  count: number;
  countryCode: string | null;
}>> {
  const rows = selectAllMapperChanges.all() as Array<{
    user: string;
    count: number;
    countryCode: string | null;
  }>;
  return rows.map((row) => ({
    user: row.user,
    count: row.count,
    countryCode: row.countryCode ?? null,
  }));
}
