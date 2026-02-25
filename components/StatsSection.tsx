"use client";

import { useEffect, useState } from "react";
import CountUp from "react-countup";
import { FiInfo } from "react-icons/fi";
import { Tooltip } from "./ui/tooltip";
import styles from "../app/page.module.css";

interface StatsSectionProps {
  totalChanges: number;
  totalChangesets: number;
  changesPerMinute: number;
  changesPerMinuteAllTimeHigh: number;
}

export default function StatsSection({
  totalChanges,
  totalChangesets,
  changesPerMinute,
  changesPerMinuteAllTimeHigh,
}: StatsSectionProps) {
  const [ratePulse, setRatePulse] = useState(false);

  useEffect(() => {
    setRatePulse(true);
    const timer = window.setTimeout(() => setRatePulse(false), 820);
    return () => window.clearTimeout(timer);
  }, [changesPerMinute]);

  return (
    <div className={styles.primaryStatsGrid}>
      <article className={styles.statCard}>
        <div className={styles.statLabelRow}>
          <p className={styles.statLabel}>Total Changes</p>
          <Tooltip content="Cumulative changes ever recorded in OpenStreetMap" showArrow>
            <button className={styles.statInfoBtn} aria-label="More information">
              <FiInfo />
            </button>
          </Tooltip>
        </div>
        <p className={styles.statValue}>
          <CountUp preserveValue end={totalChanges} separator="," />
        </p>
      </article>

      <article className={styles.statCard}>
        <div className={styles.statLabelRow}>
          <p className={styles.statLabel}>Total Changesets</p>
          <Tooltip content="All recorded mapping submissions to date" showArrow>
            <button className={styles.statInfoBtn} aria-label="More information">
              <FiInfo />
            </button>
          </Tooltip>
        </div>
        <p className={styles.statValue}>
          <CountUp preserveValue end={totalChangesets} separator="," />
        </p>
      </article>

      <article
        className={`${styles.statCard} ${styles.nodesPerMinuteCard}${
          ratePulse ? ` ${styles.nodesPerMinuteCardPulse}` : ""
        }`}
      >
        <div className={styles.statLabelRow}>
          <p className={styles.statLabel}>Changes per Minute (est.)</p>
          <Tooltip content="Rolling estimate based on newly observed closed changesets" showArrow>
            <button className={styles.statInfoBtn} aria-label="More information">
              <FiInfo />
            </button>
          </Tooltip>
        </div>
        <p
          className={`${styles.statValue} ${styles.nodesPerMinuteValue}${
            ratePulse ? ` ${styles.nodesPerMinuteValuePulse}` : ""
          }`}
        >
          <CountUp preserveValue end={changesPerMinute} separator="," />
        </p>
        <p className={styles.statCompare}>
          All-time high: {changesPerMinuteAllTimeHigh.toLocaleString()} changes/min
        </p>
      </article>
    </div>
  );
}
