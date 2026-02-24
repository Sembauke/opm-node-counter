import CountUp from "react-countup";
import styles from "../app/page.module.css";

interface MoreStatsSectionProps {
  averageChangesHour: number;
  averageChangesLastHour: number;
  largestChangesetHour: number;
  largestChangesetLastHour: number;
  uniqueMappersHour: number;
  uniqueMappersLastHour: number;
  newNodesHour: number;
  newNodesLastHour: number;
  activeCountriesHour: number;
  activeCountriesLastHour: number;
  totalSovereignCountries: number;
}

export default function MoreStatsSection({
  averageChangesHour,
  averageChangesLastHour,
  largestChangesetHour,
  largestChangesetLastHour,
  uniqueMappersHour,
  uniqueMappersLastHour,
  newNodesHour,
  newNodesLastHour,
  activeCountriesHour,
  activeCountriesLastHour,
  totalSovereignCountries,
}: MoreStatsSectionProps) {
  return (
    <div className={styles.secondaryStatsGrid}>
      <article className={styles.statCard}>
        <p className={styles.statLabel}>Average Changes</p>
        <p className={styles.statValue}>
          <CountUp preserveValue end={averageChangesHour} separator="," />
        </p>
        <p className={styles.statHint}>Mean changes per changeset in this hour window</p>
        <p className={styles.statCompare}>
          Last hour: {averageChangesLastHour.toLocaleString()}
        </p>
      </article>

      <article className={styles.statCard}>
        <p className={styles.statLabel}>Largest Changeset</p>
        <p className={styles.statValue}>
          <CountUp preserveValue end={largestChangesetHour} separator="," />
        </p>
        <p className={styles.statHint}>Highest number of changes by one mapper this hour</p>
        <p className={styles.statCompare}>
          Last hour: {largestChangesetLastHour.toLocaleString()}
        </p>
      </article>

      <article className={styles.statCard}>
        <p className={styles.statLabel}>Unique Mappers</p>
        <p className={styles.statValue}>
          <CountUp preserveValue end={uniqueMappersHour} separator="," />
        </p>
        <p className={styles.statHint}>Distinct contributors active in the latest hour</p>
        <p className={styles.statCompare}>
          Last hour: {uniqueMappersLastHour.toLocaleString()}
        </p>
      </article>

      <article className={styles.statCard}>
        <p className={styles.statLabel}>New Nodes This Hour</p>
        <p className={styles.statValue}>
          <CountUp preserveValue end={newNodesHour} separator="," />
        </p>
        <p className={styles.statHint}>Aggregate node growth captured during this hour</p>
        <p className={styles.statCompare}>
          Last hour: {newNodesLastHour.toLocaleString()}
        </p>
      </article>

      <article className={styles.statCard}>
        <p className={styles.statLabel}>Active Countries This Hour</p>
        <p className={styles.statValue}>
          <CountUp preserveValue end={activeCountriesHour} separator="," /> /{" "}
          {totalSovereignCountries.toLocaleString()}
        </p>
        <p className={styles.statHint}>
          Countries with detected edits this hour out of tracked sovereign countries
        </p>
        <p className={styles.statCompare}>
          Last hour: {activeCountriesLastHour.toLocaleString()} /{" "}
          {totalSovereignCountries.toLocaleString()}
        </p>
      </article>
    </div>
  );
}
