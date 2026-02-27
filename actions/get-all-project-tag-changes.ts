'use server'

import { db } from "@/lib/db";

const selectAllProjectTagChanges = db.prepare(`
  SELECT
    totals.tag,
    totals.total_changes AS count,
    (
      SELECT country_code
      FROM total_project_tag_country_changes
      WHERE tag = totals.tag
      ORDER BY total_changes DESC, country_code ASC
      LIMIT 1
    ) AS countryCode
  FROM total_project_tag_changes AS totals
  WHERE totals.total_changes > 0
  ORDER BY totals.total_changes DESC, totals.tag ASC
`);

export async function getAllProjectTagChanges(): Promise<Array<{ tag: string; count: number; countryCode: string | null }>> {
  const rows = selectAllProjectTagChanges.all() as Array<{
    tag: string;
    count: number;
    countryCode: string | null;
  }>;
  return rows.map((row) => ({
    tag: row.tag,
    count: row.count,
    countryCode: row.countryCode ?? null,
  }));
}
