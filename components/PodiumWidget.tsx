import styles from "../app/page.module.css";

interface Mapper {
  user: string;
  count: number;
}

interface PodiumWidgetProps {
  topMappersHour: Mapper[];
}

function MapperLink({ user }: { user: string }) {
  return (
    <a
      href={`https://www.openstreetmap.org/user/${encodeURIComponent(user)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.mapperLink}
    >
      {user}
    </a>
  );
}

export default function PodiumWidget({ topMappersHour }: PodiumWidgetProps) {
  const mappers = topMappersHour.slice(0, 18);

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Top contributors</h2>
        <p className={styles.sectionCaption}>All contributors ranked by total changes this hour</p>
      </div>

      <div className={styles.mapperTable}>
        {mappers.length === 0 ? (
          <div className={styles.mapperRow}>
            <span className={styles.mapperRank}>-</span>
            <span className={styles.mapperName}>No data yet</span>
            <span className={styles.mapperScore}>0</span>
          </div>
        ) : (
          mappers.map((mapper, idx) => {
            const rank = idx + 1;
            return (
              <div key={`${mapper.user}-${rank}`} className={styles.mapperRow}>
                <span className={styles.mapperRank}>{rank}</span>
                <span className={styles.mapperName}>
                  <MapperLink user={mapper.user} />
                </span>
                <span className={styles.mapperScore}>{mapper.count}</span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
