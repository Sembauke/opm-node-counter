import CountUp from "react-countup";
import { FiInfo } from "react-icons/fi";
import { Tooltip } from "./ui/tooltip";
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
        <div className={styles.statLabelRow}>
          <p className={styles.statLabel}>Average Changes</p>
          <Tooltip content="Mean changes per changeset in this hour window" showArrow>
            <button className={styles.statInfoBtn} aria-label="More information">
              <FiInfo />
            </button>
          </Tooltip>
        </div>
        <p className={styles.statValue}>
          <CountUp preserveValue end={averageChangesHour} separator="," />
        </p>
        <p className={styles.statCompare}>
          Last hour: {averageChangesLastHour.toLocaleString()}
        </p>
      </article>

      <article className={styles.statCard}>
        <div className={styles.statLabelRow}>
          <p className={styles.statLabel}>Largest Changeset</p>
          <Tooltip content="Highest number of changes by one mapper this hour" showArrow>
            <button className={styles.statInfoBtn} aria-label="More information">
              <FiInfo />
            </button>
          </Tooltip>
        </div>
        <p className={styles.statValue}>
          <CountUp preserveValue end={largestChangesetHour} separator="," />
        </p>
        <p className={styles.statCompare}>
          Last hour: {largestChangesetLastHour.toLocaleString()}
        </p>
      </article>

      <article className={styles.statCard}>
        <div className={styles.statLabelRow}>
          <p className={styles.statLabel}>Unique Mappers</p>
          <Tooltip content="Distinct contributors active in the latest hour" showArrow>
            <button className={styles.statInfoBtn} aria-label="More information">
              <FiInfo />
            </button>
          </Tooltip>
        </div>
        <p className={styles.statValue}>
          <CountUp preserveValue end={uniqueMappersHour} separator="," />
        </p>
        <p className={styles.statCompare}>
          Last hour: {uniqueMappersLastHour.toLocaleString()}
        </p>
      </article>

      <article className={styles.statCard}>
        <div className={styles.statLabelRow}>
          <p className={styles.statLabel}>New Nodes This Hour</p>
          <Tooltip content="Aggregate node growth captured during this hour" showArrow>
            <button className={styles.statInfoBtn} aria-label="More information">
              <FiInfo />
            </button>
          </Tooltip>
        </div>
        <p className={styles.statValue}>
          <CountUp preserveValue end={newNodesHour} separator="," />
        </p>
        <p className={styles.statCompare}>
          Last hour: {newNodesLastHour.toLocaleString()}
        </p>
      </article>

      <article className={styles.statCard}>
        <div className={styles.statLabelRow}>
          <p className={styles.statLabel}>Active Countries</p>
          <Tooltip content="Countries with detected edits this hour out of tracked sovereign countries" showArrow>
            <button className={styles.statInfoBtn} aria-label="More information">
              <FiInfo />
            </button>
          </Tooltip>
        </div>
        <p className={styles.statValue}>
          <CountUp preserveValue end={activeCountriesHour} separator="," /> /{" "}
          {totalSovereignCountries.toLocaleString()}
        </p>
        <p className={styles.statCompare}>
          Last hour: {activeCountriesLastHour.toLocaleString()} /{" "}
          {totalSovereignCountries.toLocaleString()}
        </p>
      </article>
    </div>
  );
}
