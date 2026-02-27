import Link from "next/link";
import styles from "../app/page.module.css";

interface Mapper {
  user: string;
  count: number;
  countryCode: string | null;
}

interface PodiumWidgetProps {
  topMappersHour: Mapper[];
  topMappersLastHour: Mapper[];
  leaderAllTimeHigh: number;
}

function toFlagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function getMapperFlag(countryCode: string | null) {
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) {
    return "🏳️";
  }
  return toFlagEmoji(countryCode);
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

export default function PodiumWidget({
  topMappersHour,
  topMappersLastHour,
  leaderAllTimeHigh,
}: PodiumWidgetProps) {
  const mappers = topMappersHour.slice(0, 18);
  const currentLeader = topMappersHour[0];
  const lastLeader = topMappersLastHour[0];

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Top contributors</h2>
        <p className={styles.sectionCaption}>All contributors ranked by total changes this hour</p>
      </div>
      <p className={styles.sectionCompare}>
        Current leader:{" "}
        {currentLeader ? (
          <>
            {getMapperFlag(currentLeader.countryCode)}{" "}
            <MapperLink user={currentLeader.user} /> ({currentLeader.count.toLocaleString()})
          </>
        ) : (
          "No data"
        )}
        {" • "}
        Last hour leader:{" "}
        {lastLeader ? (
          <>
            {getMapperFlag(lastLeader.countryCode)}{" "}
            <MapperLink user={lastLeader.user} /> ({lastLeader.count.toLocaleString()})
          </>
        ) : (
          "No data"
        )}
        {" • "}
        All-time high leader count: {leaderAllTimeHigh.toLocaleString()}
      </p>

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
                  <span aria-hidden>{getMapperFlag(mapper.countryCode)} </span>
                  <MapperLink user={mapper.user} />
                </span>
                <span className={styles.mapperScore}>{mapper.count}</span>
              </div>
            );
          })
        )}
      </div>

      <div className={styles.countryAllLink}>
        <Link href="/users" className={styles.countryAllButton}>
          View all users
        </Link>
      </div>
    </section>
  );
}
