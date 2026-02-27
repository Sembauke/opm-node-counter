"use client";

import { useEffect, useRef, useState } from "react";
import CountUp from "react-countup";
import styles from "./page.module.css";

interface Mapper {
  user: string;
  count: number;
  countryCode: string | null;
}

const POLL_INTERVAL_MS = 6_000;

function toFlagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function getUserFlag(countryCode: string | null) {
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) {
    return "🏳️";
  }

  return toFlagEmoji(countryCode);
}

export default function UsersGrid({ initialUsers }: { initialUsers: Mapper[] }) {
  const [users, setUsers] = useState<Mapper[]>(initialUsers);
  const prevCountsRef = useRef<Map<string, number>>(
    new Map(initialUsers.map((mapper) => [mapper.user, mapper.count]))
  );
  const [pulsingUsers, setPulsingUsers] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch("/api/users");
        if (!res.ok || !active) return;
        const incoming: Mapper[] = await res.json();

        const prev = prevCountsRef.current;
        const changed = new Set<string>();

        for (const mapper of incoming) {
          const prevCount = prev.get(mapper.user);
          if (prevCount !== undefined && prevCount !== mapper.count) {
            changed.add(mapper.user);
          }
        }

        prevCountsRef.current = new Map(incoming.map((mapper) => [mapper.user, mapper.count]));
        setUsers(incoming);

        if (changed.size > 0) {
          setPulsingUsers(changed);
          setTimeout(() => setPulsingUsers(new Set()), 820);
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
    ? users.filter((mapper) => mapper.user.toLowerCase().includes(normalized))
    : users;

  return (
    <>
      <div className={styles.searchWrap}>
        <input
          ref={inputRef}
          type="search"
          className={styles.searchInput}
          placeholder="Search users... (press / to focus)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search users"
        />
        {query && (
          <span className={styles.searchCount}>
            {filtered.length} / {users.length}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>No users match "{query}".</p>
      ) : (
        <ul className={styles.grid}>
          {filtered.map((mapper) => {
            const globalRank = users.indexOf(mapper) + 1;
            const isPulsing = pulsingUsers.has(mapper.user);
            return (
              <li
                key={mapper.user}
                className={`${styles.card}${isPulsing ? ` ${styles.cardPulse}` : ""}`}
              >
                <span className={styles.rank}>#{globalRank}</span>
                <span className={styles.flag} aria-hidden>
                  {getUserFlag(mapper.countryCode)}
                </span>
                <a
                  href={`https://www.openstreetmap.org/user/${encodeURIComponent(mapper.user)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.name}
                >
                  {mapper.user}
                </a>
                <span className={`${styles.count}${isPulsing ? ` ${styles.countPulse}` : ""}`}>
                  <CountUp preserveValue end={mapper.count} separator="," />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
