import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectTagDetail } from "@/actions/get-project-tag-detail";
import { toFlagEmoji } from "@/lib/country";
import styles from "./page.module.css";

const MAP_LON_DELTA = 0.12;
const MAP_LAT_DELTA = 0.08;

function toOsmProjectMap(centerLat: number, centerLon: number) {
  const minLon = centerLon - MAP_LON_DELTA;
  const minLat = centerLat - MAP_LAT_DELTA;
  const maxLon = centerLon + MAP_LON_DELTA;
  const maxLat = centerLat + MAP_LAT_DELTA;

  const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${centerLat}%2C${centerLon}`;
  const mapUrl = `https://www.openstreetmap.org/?mlat=${centerLat}&mlon=${centerLon}#map=7/${centerLat}/${centerLon}`;
  return { embedUrl, mapUrl };
}

interface ProjectDetailPageProps {
  params: Promise<{ tag: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { tag } = await params;
  const project = await getProjectTagDetail(decodeURIComponent(tag));

  if (!project) {
    notFound();
  }

  const projectMap =
    project.centerLat !== null && project.centerLon !== null
      ? toOsmProjectMap(project.centerLat, project.centerLon)
      : null;

  return (
    <div className={styles.page}>
      <div className={styles.backgroundArt} aria-hidden />
      <main className={styles.container}>
        <div className={styles.pageHeader}>
          <Link href="/projects" className={styles.backLink}>
            &larr; Back to projects
          </Link>
          <div>
            <h1 className={styles.title}>#{project.tag}</h1>
            <p className={styles.subtitle}>
              {project.countryCode ? `${toFlagEmoji(project.countryCode) ?? "#"} ` : ""}
              {project.count.toLocaleString()} changes •{" "}
              {project.participantCount.toLocaleString()} participants
            </p>
          </div>
        </div>

        <div className={styles.twoColumn}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Top Contributors</h2>
            {project.contributors.length === 0 ? (
              <p className={styles.empty}>No contributors yet.</p>
            ) : (
              <ul className={styles.list}>
                {project.contributors.map((contributor) => (
                  <li key={contributor.user} className={styles.row}>
                    <a
                      href={`https://www.openstreetmap.org/user/${encodeURIComponent(contributor.user)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      {contributor.user}
                    </a>
                    <p className={styles.meta}>
                      {contributor.changesetCount.toLocaleString()} changesets •{" "}
                      {contributor.totalChanges.toLocaleString()} changes
                    </p>
                    {contributor.changesetIds.length > 0 ? (
                      <div className={styles.inlineLinks}>
                        {contributor.changesetIds.map((changesetId) => (
                          <a
                            key={`${contributor.user}-${changesetId}`}
                            href={`https://www.openstreetmap.org/changeset/${changesetId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.inlineLink}
                          >
                            #{changesetId}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Latest Changesets</h2>
            {project.changesets.length === 0 ? (
              <p className={styles.empty}>No changesets yet.</p>
            ) : (
              <ul className={styles.list}>
                {project.changesets.map((changeset) => (
                  <li key={changeset.id} className={styles.row}>
                    <a
                      href={`https://www.openstreetmap.org/changeset/${changeset.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      #{changeset.id}
                    </a>
                    <p className={styles.meta}>
                      by {changeset.user} • {changeset.changes.toLocaleString()} changes
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {projectMap ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Project Location</h2>
            <div className={styles.mapWrap}>
              <iframe
                title={`Map for #${project.tag}`}
                loading="lazy"
                className={styles.mapFrame}
                src={projectMap.embedUrl}
              />
            </div>
            <a
              href={projectMap.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              Open map in OpenStreetMap
            </a>
          </section>
        ) : null}
      </main>
    </div>
  );
}
