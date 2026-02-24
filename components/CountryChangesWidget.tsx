"use client";

import styles from "../app/page.module.css";

interface CountryChangesItem {
  countryCode: string;
  count: number;
}

interface CountryChangesWidgetProps {
  topCountriesHour: CountryChangesItem[];
  topCountriesLastHour: CountryChangesItem[];
}

function toFlagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function getCountryName(countryCode: string) {
  try {
    const displayNames = new Intl.DisplayNames(undefined, { type: "region" });
    return displayNames.of(countryCode.toUpperCase()) ?? countryCode;
  } catch {
    return countryCode;
  }
}

export default function CountryChangesWidget({
  topCountriesHour,
  topCountriesLastHour,
}: CountryChangesWidgetProps) {
  const rows = topCountriesHour.slice(0, 8);
  const topCount = rows[0]?.count ?? 1;
  const currentLeader = topCountriesHour[0];
  const previousLeader = topCountriesLastHour[0];
  const currentActive = topCountriesHour.length;
  const previousActive = topCountriesLastHour.length;

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Most edited countries</h2>
        <p className={styles.sectionCaption}>Total changes grouped by country this hour</p>
      </div>
      <p className={styles.sectionCompare}>
        Active countries: {currentActive.toLocaleString()} this hour •{" "}
        {previousActive.toLocaleString()} last hour
        {currentLeader ? (
          <>
            {" • "}
            Current leader: {toFlagEmoji(currentLeader.countryCode.toUpperCase())}{" "}
            {getCountryName(currentLeader.countryCode)} ({currentLeader.count.toLocaleString()})
          </>
        ) : null}
        {previousLeader ? (
          <>
            {" • "}
            Last hour leader: {toFlagEmoji(previousLeader.countryCode.toUpperCase())}{" "}
            {getCountryName(previousLeader.countryCode)} ({previousLeader.count.toLocaleString()})
          </>
        ) : null}
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
                  {toFlagEmoji(countryCode)}
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
    </section>
  );
}
