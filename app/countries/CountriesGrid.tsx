"use client";

import { useEffect, useRef, useState } from "react";
import CountUp from "react-countup";
import styles from "./page.module.css";
import { getCountryName, toFlagEmoji } from "@/lib/country";

interface Country {
  countryCode: string;
  count: number;
}

const POLL_INTERVAL_MS = 6_000;
const ITEMS_PER_PAGE = 60;

export default function CountriesGrid({ initialCountries }: { initialCountries: Country[] }) {
  const [countries, setCountries] = useState<Country[]>(initialCountries);
  const prevCountsRef = useRef<Map<string, number>>(
    new Map(initialCountries.map((c) => [c.countryCode, c.count]))
  );
  const [pulsingCodes, setPulsingCodes] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
        setQuery("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? countries.filter((c) => {
        const name = getCountryName(c.countryCode).toLowerCase();
        return name.includes(normalized) || c.countryCode.toLowerCase().includes(normalized);
      })
    : countries;
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCountries = filtered.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalized]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  return (
    <>
      <div className={styles.searchWrap}>
        <input
          ref={inputRef}
          type="search"
          className={styles.searchInput}
          placeholder="Search countries… (press / to focus)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search countries"
        />
        {query && (
          <span className={styles.searchCount}>
            {filtered.length} / {countries.length}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>No countries match &ldquo;{query}&rdquo;.</p>
      ) : (
        <>
          <ul className={styles.grid}>
            {paginatedCountries.map((country) => {
              const globalRank = countries.indexOf(country) + 1;
              const isPulsing = pulsingCodes.has(country.countryCode);
              return (
                <li
                  key={country.countryCode}
                  className={`${styles.card}${isPulsing ? ` ${styles.cardPulse}` : ""}`}
                >
                  <span className={styles.rank}>#{globalRank}</span>
                  <span className={styles.flag} aria-hidden>
                    {toFlagEmoji(country.countryCode) ?? "🏳️"}
                  </span>
                  <span className={styles.name}>{getCountryName(country.countryCode)}</span>
                  <span className={`${styles.count}${isPulsing ? ` ${styles.countPulse}` : ""}`}>
                    <CountUp preserveValue end={country.count} separator="," />
                  </span>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 ? (
            <nav className={styles.pagination} aria-label="Country pagination">
              <button
                type="button"
                className={styles.pageButton}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <p className={styles.pageMeta}>
                Page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}
              </p>
              <button
                type="button"
                className={styles.pageButton}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                Next
              </button>
            </nav>
          ) : null}
        </>
      )}
    </>
  );
}
