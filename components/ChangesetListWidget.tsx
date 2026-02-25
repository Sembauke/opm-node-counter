import styles from "../app/page.module.css";
import { Changeset } from "@/types/changeset";

interface ChangesetListWidgetProps {
  changesetBatch: Changeset[];
  newChangesetIds: number[];
}

function formatComment(comment?: string) {
  const clean = comment?.trim();
  return clean && clean.length > 0 ? clean : "No comment provided.";
}

export default function ChangesetListWidget({
  changesetBatch,
  newChangesetIds,
}: ChangesetListWidgetProps) {
  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Latest changesets</h2>
        <p className={styles.sectionCaption}>Most recent edits from the live OSM feed</p>
      </div>

      <ul className={styles.changesetList}>
        {changesetBatch.slice(0, 5).map((changeset) => {
          const isNew = newChangesetIds.includes(changeset.id);
          const locationCode = changeset.countryCode ?? "Unknown";
          const locationFlag = changeset.countryFlag ?? "🏳️";

          return (
            <li
              key={changeset.id}
              className={`${styles.changesetCard}${isNew ? ` ${styles.changesetCardNew}` : ""}`}
            >
              <div className={styles.changesetTop}>
                <span className={styles.changesetUser}>
                  {changeset.user ? (
                    <a
                      href={`https://www.openstreetmap.org/changeset/${changeset.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.mapperLink}
                    >
                      {changeset.user}
                    </a>
                  ) : (
                    "Unknown mapper"
                  )}
                </span>
                <div className={styles.changesetMetaGroup}>
                  <span className={styles.changesetLocation} title={`Changeset location: ${locationCode}`}>
                    <span aria-hidden>{locationFlag}</span> {locationCode}
                  </span>
                  <span className={styles.changesetMeta}>#{changeset.id}</span>
                </div>
              </div>

              <p className={styles.changesetComment}>{formatComment(changeset.tags?.comment)}</p>
              <span className={styles.changesetCount}>
                {changeset.changes_count.toLocaleString()} {changeset.changes_count === 1 ? "change" : "changes"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
