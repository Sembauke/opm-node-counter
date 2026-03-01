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
    ) AS countryCode,
    (
      SELECT COUNT(DISTINCT details.user)
      FROM total_project_tag_changesets AS details
      WHERE details.tag = totals.tag
    ) AS participantCount,
    (
      SELECT AVG(details.center_lat)
      FROM total_project_tag_changesets AS details
      WHERE details.tag = totals.tag AND details.center_lat IS NOT NULL
    ) AS centerLat,
    (
      SELECT AVG(details.center_lon)
      FROM total_project_tag_changesets AS details
      WHERE details.tag = totals.tag AND details.center_lon IS NOT NULL
    ) AS centerLon
  FROM total_project_tag_changes AS totals
  WHERE totals.total_changes > 0
  ORDER BY totals.total_changes DESC, totals.tag ASC
`);

export interface ProjectTagListItem {
  tag: string;
  count: number;
  countryCode: string | null;
  participantCount: number;
}

export async function getAllProjectTagChanges(): Promise<ProjectTagListItem[]> {
  const rows = selectAllProjectTagChanges.all() as Array<{
    tag: string;
    count: number;
    countryCode: string | null;
    participantCount: number;
  }>;

  return rows.map((row) => ({
    tag: row.tag,
    count: Number(row.count),
    countryCode: row.countryCode ?? null,
    participantCount: Number(row.participantCount ?? 0),
  }));
}
