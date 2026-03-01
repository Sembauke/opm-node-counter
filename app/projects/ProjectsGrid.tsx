"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import CountUp from "react-countup";
import styles from "./page.module.css";
import { toFlagEmoji } from "@/lib/country";

interface ProjectTag {
  tag: string;
  count: number;
  countryCode: string | null;
  participantCount: number;
}

const POLL_INTERVAL_MS = 6_000;
const ITEMS_PER_PAGE = 60;
const DEFAULT_PARTICIPANT_THRESHOLD = 5;

export default function ProjectsGrid({ initialProjects }: { initialProjects: ProjectTag[] }) {
  const [projects, setProjects] = useState<ProjectTag[]>(initialProjects);
  const prevCountsRef = useRef<Map<string, number>>(
    new Map(initialProjects.map((project) => [project.tag, project.count]))
  );
  const [pulsingTags, setPulsingTags] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [participantThreshold, setParticipantThreshold] = useState(
    DEFAULT_PARTICIPANT_THRESHOLD
  );
  const [currentPage, setCurrentPage] = useState(1);
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
  const maxParticipantCount = Math.max(
    DEFAULT_PARTICIPANT_THRESHOLD,
    ...projects.map((project) => project.participantCount)
  );
  const filtered = projects.filter((project) => {
    if (project.participantCount < participantThreshold) {
      return false;
    }

    if (!normalized) {
      return true;
    }

    return project.tag.toLowerCase().includes(normalized);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProjects = filtered.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalized, participantThreshold]);

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

      <div className={styles.filterControls}>
        <label htmlFor="participant-threshold" className={styles.sliderLabel}>
          Minimum participants: {participantThreshold.toLocaleString()}
        </label>
        <input
          id="participant-threshold"
          type="range"
          min={1}
          max={maxParticipantCount}
          step={1}
          value={participantThreshold}
          onChange={(event) => setParticipantThreshold(Number(event.target.value))}
          className={styles.sliderInput}
          aria-label="Minimum project participants"
        />
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>
          No projects match the current filters.
        </p>
      ) : (
        <>
          <ul className={styles.grid}>
            {paginatedProjects.map((project) => {
              const globalRank = projects.indexOf(project) + 1;
              const isPulsing = pulsingTags.has(project.tag);

              return (
                <li
                  key={project.tag}
                  className={`${styles.card}${isPulsing ? ` ${styles.cardPulse}` : ""}`}
                >
                  <Link
                    href={`/projects/${encodeURIComponent(project.tag)}`}
                    className={styles.cardLink}
                    aria-label={`Open project ${project.tag}`}
                  >
                    <span className={styles.rank}>#{globalRank}</span>
                    <span className={styles.flag} aria-hidden>
                      {project.countryCode ? (toFlagEmoji(project.countryCode) ?? "#") : "#"}
                    </span>
                    <span className={styles.nameLink}>#{project.tag}</span>
                    <span className={`${styles.count}${isPulsing ? ` ${styles.countPulse}` : ""}`}>
                      <CountUp preserveValue end={project.count} separator="," />
                    </span>
                    <span className={styles.projectMeta}>
                      {project.participantCount.toLocaleString()} participants
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 ? (
            <nav className={styles.pagination} aria-label="Project pagination">
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
