"use client";

import { useEffect, useRef, useState } from "react";
import CountUp from "react-countup";
import styles from "./page.module.css";

interface Country {
  countryCode: string;
  count: number;
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

const POLL_INTERVAL_MS = 6_000;

export default function CountriesGrid({ initialCountries }: { initialCountries: Country[] }) {
  const [countries, setCountries] = useState<Country[]>(initialCountries);
  const prevCountsRef = useRef<Map<string, number>>(
    new Map(initialCountries.map((c) => [c.countryCode, c.count]))
  );
  const [pulsingCodes, setPulsingCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch("/api/countries");
        if (!res.ok || !active) return;
        const incoming: Country[] = await res.json();

        const prev = prevCountsRef.current;
        const changed = new Set<string>();

        for (const country of incoming) {
          const prevCount = prev.get(country.countryCode);
          if (prevCount !== undefined && prevCount !== country.count) {
            changed.add(country.countryCode);
          }
        }

        prevCountsRef.current = new Map(incoming.map((c) => [c.countryCode, c.count]));
        setCountries(incoming);

        if (changed.size > 0) {
          setPulsingCodes(changed);
          setTimeout(() => setPulsingCodes(new Set()), 820);
        }
      } catch {
        // silently ignore fetch errors
      }
    }

    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <ul className={styles.grid}>
      {countries.map((country, index) => {
        const isPulsing = pulsingCodes.has(country.countryCode);
        return (
          <li
            key={country.countryCode}
            className={`${styles.card}${isPulsing ? ` ${styles.cardPulse}` : ""}`}
          >
            <span className={styles.rank}>#{index + 1}</span>
            <span className={styles.flag} aria-hidden>
              {toFlagEmoji(country.countryCode)}
            </span>
            <span className={styles.name}>{getCountryName(country.countryCode)}</span>
            <span className={`${styles.count}${isPulsing ? ` ${styles.countPulse}` : ""}`}>
              <CountUp preserveValue end={country.count} separator="," />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
