"use client";

import { useEffect, useState } from "react";
import CountUp from "react-countup";
import styles from "../app/page.module.css";

interface StatsSectionProps {
  totalNodes: number;
  totalChangesets: number;
  nodesPerMinute: number;
}

export default function StatsSection({
  totalNodes,
  totalChangesets,
  nodesPerMinute,
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
        <p className={styles.statLabel}>Total Nodes</p>
        <p className={styles.statValue}>
          <CountUp preserveValue end={totalNodes} separator="," />
        </p>
        <p className={styles.statHint}>
          Cumulative nodes ever created in OpenStreetMap (not current alive nodes)
        </p>
      </article>

      <article className={styles.statCard}>
        <p className={styles.statLabel}>Total Changesets</p>
        <p className={styles.statValue}>
          <CountUp preserveValue end={totalChangesets} separator="," />
        </p>
        <p className={styles.statHint}>All recorded mapping submissions to date</p>
      </article>

      <article
        className={`${styles.statCard} ${styles.nodesPerMinuteCard}${
          ratePulse ? ` ${styles.nodesPerMinuteCardPulse}` : ""
        }`}
      >
        <p className={styles.statLabel}>Nodes per Minute (est.)</p>
        <p
          className={`${styles.statValue} ${styles.nodesPerMinuteValue}${
            ratePulse ? ` ${styles.nodesPerMinuteValuePulse}` : ""
          }`}
        >
          <CountUp preserveValue end={nodesPerMinute} separator="," />
        </p>
        <p className={styles.statHint}>Rolling estimate based on newly observed closed changesets</p>
      </article>
    </div>
  );
}
