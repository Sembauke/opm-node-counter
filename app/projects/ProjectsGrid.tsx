"use client";

import { useEffect, useRef, useState } from "react";
import CountUp from "react-countup";
import styles from "./page.module.css";

interface ProjectTag {
  tag: string;
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

export default function ProjectsGrid({ initialProjects }: { initialProjects: ProjectTag[] }) {
  const [projects, setProjects] = useState<ProjectTag[]>(initialProjects);
  const prevCountsRef = useRef<Map<string, number>>(
    new Map(initialProjects.map((project) => [project.tag, project.count]))
  );
  const [pulsingTags, setPulsingTags] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch("/api/projects");
        if (!res.ok || !active) return;
        const incoming: ProjectTag[] = await res.json();

        const prev = prevCountsRef.current;
        const changed = new Set<string>();

        for (const project of incoming) {
          const prevCount = prev.get(project.tag);
          if (prevCount !== undefined && prevCount !== project.count) {
            changed.add(project.tag);
          }
        }

        prevCountsRef.current = new Map(incoming.map((project) => [project.tag, project.count]));
        setProjects(incoming);

        if (changed.size > 0) {
          setPulsingTags(changed);
          setTimeout(() => setPulsingTags(new Set()), 820);
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
    ? projects.filter((project) => project.tag.toLowerCase().includes(normalized))
    : projects;

  return (
    <>
      <div className={styles.searchWrap}>
        <input
          ref={inputRef}
          type="search"
          className={styles.searchInput}
          placeholder="Search projects... (press / to focus)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search projects"
        />
        {query && (
          <span className={styles.searchCount}>
            {filtered.length} / {projects.length}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>No projects match "{query}".</p>
      ) : (
        <ul className={styles.grid}>
          {filtered.map((project) => {
            const globalRank = projects.indexOf(project) + 1;
            const isPulsing = pulsingTags.has(project.tag);
            return (
              <li
                key={project.tag}
                className={`${styles.card}${isPulsing ? ` ${styles.cardPulse}` : ""}`}
              >
                <span className={styles.rank}>#{globalRank}</span>
                <span className={styles.flag} aria-hidden>
                  {project.countryCode ? toFlagEmoji(project.countryCode) : "#"}
                </span>
                <span className={styles.name}>#{project.tag}</span>
                <span className={`${styles.count}${isPulsing ? ` ${styles.countPulse}` : ""}`}>
                  <CountUp preserveValue end={project.count} separator="," />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
