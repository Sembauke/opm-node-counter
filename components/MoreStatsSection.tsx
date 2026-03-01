import CountUp from "react-countup";
import { FiInfo } from "react-icons/fi";
import type { ReactNode } from "react";
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

interface ComparisonMetric {
  label: string;
  value: string;
}

interface MetricCardProps {
  label: string;
  tooltip: string;
  value: ReactNode;
  comparisons: ComparisonMetric[];
}

function MetricCard({ label, tooltip, value, comparisons }: MetricCardProps) {
  return (
    <article className={styles.statCard}>
      <div className={styles.statLabelRow}>
        <p className={styles.statLabel}>{label}</p>
        <Tooltip content={tooltip} showArrow>
          <button className={styles.statInfoBtn} aria-label="More information">
            <FiInfo />
          </button>
        </Tooltip>
      </div>
      <p className={styles.statValue}>{value}</p>
      <p className={`${styles.statCompare} ${styles.statCompareSplit}`}>
        {comparisons.map((comparison) => (
          <span key={comparison.label} className={styles.statCompareLine}>
            {comparison.label}: {comparison.value}
          </span>
        ))}
      </p>
    </article>
  );
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
      <MetricCard
        label="Average Changes"
        tooltip="Mean changes per changeset in this hour window"
        value={
          <CountUp preserveValue end={averageChangesHour} separator="," />
        }
        comparisons={[
          { label: "Last hour", value: averageChangesLastHour.toLocaleString() },
          { label: "All-time high", value: averageChangesAllTimeHigh.toLocaleString() },
        ]}
      />

      <MetricCard
        label="Unique Mappers"
        tooltip="Distinct contributors active in the latest hour"
        value={
          <CountUp preserveValue end={uniqueMappersHour} separator="," />
        }
        comparisons={[
          { label: "Last hour", value: uniqueMappersLastHour.toLocaleString() },
          { label: "All-time high", value: uniqueMappersAllTimeHigh.toLocaleString() },
        ]}
      />

      <MetricCard
        label="New Nodes This Hour"
        tooltip="Aggregate node growth captured during this hour"
        value={
          <CountUp preserveValue end={newNodesHour} separator="," />
        }
        comparisons={[
          { label: "Last hour", value: newNodesLastHour.toLocaleString() },
          { label: "All-time high", value: newNodesAllTimeHigh.toLocaleString() },
        ]}
      />

      <MetricCard
        label="Active Countries"
        tooltip="Countries with detected edits this hour out of tracked sovereign countries"
        value={
          <>
          <CountUp preserveValue end={activeCountriesHour} separator="," /> /{" "}
          {totalSovereignCountries.toLocaleString()}
          </>
        }
        comparisons={[
          {
            label: "Last hour",
            value: `${activeCountriesLastHour.toLocaleString()} / ${totalSovereignCountries.toLocaleString()}`,
          },
          {
            label: "All-time high",
            value: `${activeCountriesAllTimeHigh.toLocaleString()} / ${totalSovereignCountries.toLocaleString()}`,
          },
        ]}
      />
    </div>
  );
}
