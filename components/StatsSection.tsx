"use client";

import { useEffect, useState } from "react";
import CountUp from "react-countup";
import { FiInfo } from "react-icons/fi";
import { Tooltip } from "./ui/tooltip";
import styles from "../app/page.module.css";

interface StatsSectionProps {
  totalNodes: number;
  totalChangesets: number;
  nodesPerMinute: number;
  nodesPerMinuteAllTimeHigh: number;
}

export default function StatsSection({
  totalNodes,
  totalChangesets,
  nodesPerMinute,
  nodesPerMinuteAllTimeHigh,
}: StatsSectionProps) {
  const [ratePulse, setRatePulse] = useState(false);

  useEffect(() => {
    setRatePulse(true);
    const timer = window.setTimeout(() => setRatePulse(false), 820);
    return () => window.clearTimeout(timer);
  }, [nodesPerMinute]);

  return (
    <div className={styles.primaryStatsGrid}>
      <article className={styles.statCard}>
        <div className={styles.statLabelRow}>
          <p className={styles.statLabel}>Total Nodes</p>
          <Tooltip content="Cumulative nodes ever created in OpenStreetMap (not current alive nodes)" showArrow>
            <button className={styles.statInfoBtn} aria-label="More information">
              <FiInfo />
            </button>
          </Tooltip>
        </div>
        <p className={styles.statValue}>
          <CountUp preserveValue end={totalNodes} separator="," />
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
          <p className={styles.statLabel}>Nodes per Minute (est.)</p>
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
          <CountUp preserveValue end={nodesPerMinute} separator="," />
        </p>
        <p className={styles.statCompare}>
          All-time high: {nodesPerMinuteAllTimeHigh.toLocaleString()} nodes/min
        </p>
      </article>
    </div>
  );
}
