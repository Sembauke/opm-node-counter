'use server'

import { db } from "@/lib/db";

const CONTRIBUTOR_LIMIT = 20;
const CHANGESET_LIMIT = 40;
const CONTRIBUTOR_CHANGESET_SCAN_LIMIT = 2000;
const USER_CHANGESET_ID_PREVIEW_LIMIT = 10;

const selectProjectSummary = db.prepare(`
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
  WHERE totals.tag = ?
  LIMIT 1
`);

const selectContributors = db.prepare(`
  SELECT
    user,
    COUNT(*) AS changesetCount,
    SUM(changes) AS totalChanges
  FROM total_project_tag_changesets
  WHERE tag = ?
  GROUP BY user
  ORDER BY changesetCount DESC, totalChanges DESC, user ASC
  LIMIT ${CONTRIBUTOR_LIMIT}
`);

const selectChangesets = db.prepare(`
  SELECT
    changeset_id AS id,
    user,
    changes,
    created_at AS createdAt,
    center_lat AS centerLat,
    center_lon AS centerLon
  FROM total_project_tag_changesets
  WHERE tag = ?
  ORDER BY COALESCE(created_at, '') DESC, changeset_id DESC
  LIMIT ${CHANGESET_LIMIT}
`);

const selectContributorChangesetIds = db.prepare(`
  SELECT user, changeset_id AS changesetId
  FROM total_project_tag_changesets
  WHERE tag = ?
  ORDER BY COALESCE(created_at, '') DESC, changeset_id DESC
  LIMIT ${CONTRIBUTOR_CHANGESET_SCAN_LIMIT}
`);

export interface ProjectTagDetail {
  tag: string;
  count: number;
  countryCode: string | null;
  participantCount: number;
  centerLat: number | null;
  centerLon: number | null;
  contributors: Array<{
    user: string;
    changesetCount: number;
    totalChanges: number;
    changesetIds: number[];
  }>;
  changesets: Array<{
    id: number;
    user: string;
    changes: number;
    createdAt: string | null;
    centerLat: number | null;
    centerLon: number | null;
  }>;
}

export async function getProjectTagDetail(tag: string): Promise<ProjectTagDetail | null> {
  const normalizedTag = tag.trim().toLowerCase();
  if (!normalizedTag) {
    return null;
  }

  const summary = selectProjectSummary.get(normalizedTag) as
    | {
        tag: string;
        count: number;
        countryCode: string | null;
        participantCount: number;
        centerLat: number | null;
        centerLon: number | null;
      }
    | undefined;

  if (!summary) {
    return null;
  }

  const contributors = selectContributors.all(normalizedTag) as Array<{
    user: string;
    changesetCount: number;
    totalChanges: number;
  }>;

  const changesets = selectChangesets.all(normalizedTag) as Array<{
    id: number;
    user: string;
    changes: number;
    createdAt: string | null;
    centerLat: number | null;
    centerLon: number | null;
  }>;

  const contributorChangesetRows = selectContributorChangesetIds.all(normalizedTag) as Array<{
    user: string;
    changesetId: number;
  }>;
  const contributorChangesetIds = new Map<string, number[]>();
  for (const row of contributorChangesetRows) {
    const current = contributorChangesetIds.get(row.user) ?? [];
    if (current.length < USER_CHANGESET_ID_PREVIEW_LIMIT) {
      current.push(Number(row.changesetId));
    }
    contributorChangesetIds.set(row.user, current);
  }

  return {
    tag: summary.tag,
    count: Number(summary.count),
    countryCode: summary.countryCode ?? null,
    participantCount: Number(summary.participantCount ?? 0),
    centerLat: summary.centerLat === null ? null : Number(summary.centerLat),
    centerLon: summary.centerLon === null ? null : Number(summary.centerLon),
    contributors: contributors.map((contributor) => ({
      user: contributor.user,
      changesetCount: Number(contributor.changesetCount),
      totalChanges: Number(contributor.totalChanges),
      changesetIds: contributorChangesetIds.get(contributor.user) ?? [],
    })),
    changesets: changesets.map((changeset) => ({
      id: Number(changeset.id),
      user: changeset.user,
      changes: Number(changeset.changes),
      createdAt: changeset.createdAt ?? null,
      centerLat: changeset.centerLat === null ? null : Number(changeset.centerLat),
      centerLon: changeset.centerLon === null ? null : Number(changeset.centerLon),
    })),
  };
}
