"use client";

import Link from "next/link";
import { FiInfo } from "react-icons/fi";
import { Tooltip } from "./ui/tooltip";
import styles from "../app/page.module.css";
import { getCountryName, toFlagEmoji } from "@/lib/country";

interface CountryChangesItem {
  countryCode: string;
  count: number;
}

interface CountryChangesWidgetProps {
  topCountriesHour: CountryChangesItem[];
  topCountriesLastHour: CountryChangesItem[];
  leaderAllTimeHigh: number;
}

export default function CountryChangesWidget({
  topCountriesHour,
  topCountriesLastHour,
  leaderAllTimeHigh,
}: CountryChangesWidgetProps) {
  const rows = topCountriesHour.slice(0, 8);
  const topCount = rows[0]?.count ?? 1;
  const currentLeader = topCountriesHour[0];
  const previousLeader = topCountriesLastHour[0];

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div className={styles.statLabelRow}>
          <h2 className={styles.sectionTitle}>Most edited countries</h2>
          <Tooltip content="Total changes grouped by country this hour" showArrow>
            <button className={styles.statInfoBtn} aria-label="More information">
              <FiInfo />
            </button>
          </Tooltip>
        </div>
      </div>
      <p className={styles.sectionCompare}>
        {currentLeader ? (
          <>
            Current leader: {toFlagEmoji(currentLeader.countryCode) ?? "🏳️"}{" "}
            {getCountryName(currentLeader.countryCode)} ({currentLeader.count.toLocaleString()})
          </>
        ) : (
          <>Current leader: No data</>
        )}
        {" • "}
        {previousLeader ? (
          <>
            Last hour leader: {toFlagEmoji(previousLeader.countryCode) ?? "🏳️"}{" "}
            {getCountryName(previousLeader.countryCode)} ({previousLeader.count.toLocaleString()})
          </>
        ) : (
          <>Last hour leader: No data</>
        )}
        {" • "}
        All-time high leader count: {leaderAllTimeHigh.toLocaleString()}
      </p>

      {rows.length === 0 ? (
        <p className={styles.countryEmptyState}>No country totals yet in this hour.</p>
      ) : (
        <ul className={styles.countryChangesList}>
          {rows.map((row, index) => {
            const widthPercent = Math.max((row.count / topCount) * 100, 5);
            const countryCode = row.countryCode.toUpperCase();

            return (
              <li key={row.countryCode} className={styles.countryRow}>
                <span className={styles.countryRank}>{index + 1}</span>
                <span className={styles.countryRowFlag} aria-hidden>
                  {toFlagEmoji(countryCode) ?? "🏳️"}
                </span>
                <span className={styles.countryIdentity}>{getCountryName(countryCode)}</span>
                <span className={styles.countryCount}>{row.count.toLocaleString()}</span>
                <span className={styles.countryBar}>
                  <span className={styles.countryBarFill} style={{ width: `${widthPercent}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.countryAllLink}>
        <Link href="/countries" className={styles.countryAllButton}>
          View all countries
        </Link>
      </div>
    </section>
  );
}
