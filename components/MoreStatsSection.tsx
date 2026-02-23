import CountUp from "react-countup";
import styles from "../app/page.module.css";

interface MoreStatsSectionProps {
  averageChangesHour: number;
  largestChangesetHour: number;
  uniqueMappersHour: number;
  newNodesHour: number;
}

export default function MoreStatsSection({
  averageChangesHour,
  largestChangesetHour,
  uniqueMappersHour,
  newNodesHour,
}: MoreStatsSectionProps) {
  return (
    <div className={styles.secondaryStatsGrid}>
      <article className={styles.statCard}>
        <p className={styles.statLabel}>Average Changes</p>
        <p className={styles.statValue}>
          <CountUp preserveValue end={averageChangesHour} separator="," />
        </p>
        <p className={styles.statHint}>Mean changes per changeset in this hour window</p>
      </article>

      <article className={styles.statCard}>
        <p className={styles.statLabel}>Largest Changeset</p>
        <p className={styles.statValue}>
          <CountUp preserveValue end={largestChangesetHour} separator="," />
        </p>
        <p className={styles.statHint}>Highest number of changes by one mapper this hour</p>
      </article>

      <article className={styles.statCard}>
        <p className={styles.statLabel}>Unique Mappers</p>
        <p className={styles.statValue}>
          <CountUp preserveValue end={uniqueMappersHour} separator="," />
        </p>
        <p className={styles.statHint}>Distinct contributors active in the latest hour</p>
      </article>

      <article className={styles.statCard}>
        <p className={styles.statLabel}>New Nodes This Hour</p>
        <p className={styles.statValue}>
          <CountUp preserveValue end={newNodesHour} separator="," />
        </p>
        <p className={styles.statHint}>Aggregate node growth captured during this hour</p>
      </article>
    </div>
  );
}
