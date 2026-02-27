import CountUp from "react-countup";
import { FiInfo } from "react-icons/fi";
import { Tooltip } from "./ui/tooltip";
import styles from "../app/page.module.css";

interface MoreStatsSectionProps {
  averageChangesHour: number;
  averageChangesLastHour: number;
  averageChangesAllTimeHigh: number;
  uniqueMappersHour: number;
  uniqueMappersLastHour: number;
  uniqueMappersAllTimeHigh: number;
  newNodesHour: number;
  newNodesLastHour: number;
  newNodesAllTimeHigh: number;
  activeCountriesHour: number;
  activeCountriesLastHour: number;
  activeCountriesAllTimeHigh: number;
  totalSovereignCountries: number;
}

export default function MoreStatsSection({
  averageChangesHour,
  averageChangesLastHour,
  averageChangesAllTimeHigh,
  uniqueMappersHour,
  uniqueMappersLastHour,
  uniqueMappersAllTimeHigh,
  newNodesHour,
  newNodesLastHour,
  newNodesAllTimeHigh,
  activeCountriesHour,
  activeCountriesLastHour,
  activeCountriesAllTimeHigh,
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
        <p className={`${styles.statCompare} ${styles.statCompareSplit}`}>
          <span className={styles.statCompareLine}>
            Last hour: {averageChangesLastHour.toLocaleString()}
          </span>
          <span className={styles.statCompareLine}>
            All-time high: {averageChangesAllTimeHigh.toLocaleString()}
          </span>
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
        <p className={`${styles.statCompare} ${styles.statCompareSplit}`}>
          <span className={styles.statCompareLine}>
            Last hour: {uniqueMappersLastHour.toLocaleString()}
          </span>
          <span className={styles.statCompareLine}>
            All-time high: {uniqueMappersAllTimeHigh.toLocaleString()}
          </span>
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
        <p className={`${styles.statCompare} ${styles.statCompareSplit}`}>
          <span className={styles.statCompareLine}>
            Last hour: {newNodesLastHour.toLocaleString()}
          </span>
          <span className={styles.statCompareLine}>
            All-time high: {newNodesAllTimeHigh.toLocaleString()}
          </span>
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
        <p className={`${styles.statCompare} ${styles.statCompareSplit}`}>
          <span className={styles.statCompareLine}>
            Last hour: {activeCountriesLastHour.toLocaleString()} /{" "}
            {totalSovereignCountries.toLocaleString()}
          </span>
          <span className={styles.statCompareLine}>
            All-time high: {activeCountriesAllTimeHigh.toLocaleString()} /{" "}
            {totalSovereignCountries.toLocaleString()}
          </span>
        </p>
      </article>
    </div>
  );
}
