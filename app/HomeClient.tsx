"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { io } from "socket.io-client";
import { FaGlobe } from "react-icons/fa";
import { LuMoon, LuSun } from "react-icons/lu";
import styles from "./page.module.css";
import PodiumWidget from "../components/PodiumWidget";
import CountryChangesWidget from "../components/CountryChangesWidget";
import StatsSection from "../components/StatsSection";
import MoreStatsSection from "../components/MoreStatsSection";
import ChangesetListWidget from "../components/ChangesetListWidget";
import TotalChangesetsLineGraph, {
  type ChangesetsTrendPoint,
} from "../components/TotalChangesetsLineGraph";
import { Changeset } from "@/types/changeset";
import { useColorMode } from "@/components/ui/color-mode";

interface HomeClientProps {
  changesetBatch: Changeset[];
  totalNodes: number;
  totalChangesets: number;
  uniqueMappersHour: number;
  topMappersHour: { user: string; count: number }[];
  topCountriesHour: { countryCode: string; count: number }[];
  averageChangesHour: number;
  largestChangesetHour: number;
  nodesPerMinute: number;
  newNodesHour?: number;
  changesetsTrend: ChangesetsTrendPoint[];
}

interface LiveData {
  changesetBatch: Changeset[];
  totalNodes: number;
  totalChangesets: number;
  uniqueMappersHour: number;
  topMappersHour: { user: string; count: number }[];
  topCountriesHour: { countryCode: string; count: number }[];
  averageChangesHour: number;
  largestChangesetHour: number;
  nodesPerMinute: number;
  newNodesHour: number;
}

interface FallingNode {
  id: number;
  kind: "flag" | "contributor";
  glyph: string;
  label?: string;
  leftPercent: number;
  sizeRem: number;
  durationMs: number;
  delayMs: number;
  driftPx: number;
  opacity: number;
  tiltDeg: number;
  spinDeg: number;
}

type ParticleLane = "left" | "right";

interface ParticlePlacement {
  leftPercent: number;
  lane: ParticleLane;
}

export type { HomeClientProps };

const CHANGES_PER_FLAG_PARTICLE = 120;
const MAX_FLAGS_PER_CHANGESET = 18;
const MAX_FLAGS_PER_TICK = 84;
const MAX_CONTRIBUTOR_PARTICLES_PER_TICK = 14;
const MAX_ACTIVE_PARTICLES = 260;
const TREND_CLIENT_LIMIT = 5000;

function toFlagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function getChangesetFlag(changeset: Changeset): string {
  const knownFlag = changeset.countryFlag?.trim();
  if (knownFlag) {
    return knownFlag;
  }

  const knownCode = changeset.countryCode?.trim();
  if (knownCode && /^[a-z]{2}$/i.test(knownCode)) {
    return toFlagEmoji(knownCode);
  }

  return "🏳️";
}

function formatContributorLabel(user: string): string {
  const trimmed = user.trim();
  if (trimmed.length <= 18) {
    return trimmed;
  }
  return `${trimmed.slice(0, 17)}…`;
}

function pickParticlePlacement(containerElement: HTMLElement | null): ParticlePlacement | null {
  if (typeof window === "undefined" || !containerElement) {
    return null;
  }

  const viewportWidth = window.innerWidth;
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return null;
  }

  const rect = containerElement.getBoundingClientRect();
  const sideInset = 10;
  const leftLaneStart = sideInset;
  const leftLaneEnd = Math.max(rect.left - sideInset, leftLaneStart);
  const rightLaneStart = Math.min(rect.right + sideInset, viewportWidth - sideInset);
  const rightLaneEnd = viewportWidth - sideInset;

  const leftLaneWidth = Math.max(leftLaneEnd - leftLaneStart, 0);
  const rightLaneWidth = Math.max(rightLaneEnd - rightLaneStart, 0);

  if (leftLaneWidth < 8 && rightLaneWidth < 8) {
    return null;
  }

  let lane: ParticleLane;
  if (leftLaneWidth >= 8 && rightLaneWidth >= 8) {
    lane =
      Math.random() < leftLaneWidth / (leftLaneWidth + rightLaneWidth)
        ? "left"
        : "right";
  } else {
    lane = leftLaneWidth >= 8 ? "left" : "right";
  }

  const x =
    lane === "left"
      ? leftLaneStart + Math.random() * leftLaneWidth
      : rightLaneStart + Math.random() * rightLaneWidth;

  return { leftPercent: (x / viewportWidth) * 100, lane };
}

function getCountryCoverage(changesets: Changeset[]): number {
  if (changesets.length === 0) {
    return 0;
  }

  const resolvedCount = changesets.filter((changeset) => changeset.countryCode).length;
  return resolvedCount / changesets.length;
}

function mergeCountryData(nextBatch: Changeset[], previousBatch: Changeset[]): Changeset[] {
  const previousById = new Map(previousBatch.map((changeset) => [changeset.id, changeset]));

  return nextBatch.map((changeset) => {
    if (changeset.countryCode || changeset.countryFlag) {
      return changeset;
    }

    const previous = previousById.get(changeset.id);
    if (!previous) {
      return changeset;
    }

    if (!previous.countryCode && !previous.countryFlag) {
      return changeset;
    }

    return {
      ...changeset,
      countryCode: previous.countryCode ?? null,
      countryFlag: previous.countryFlag ?? null,
    };
  });
}

export default function HomeClient({
  changesetBatch: initialChangesetBatch,
  totalNodes: initialTotalNodes,
  totalChangesets: initialTotalChangesets,
  uniqueMappersHour: initialUniqueMappersHour,
  topMappersHour: initialTopMappersHour,
  topCountriesHour: initialTopCountriesHour,
  averageChangesHour: initialAverageChangesHour,
  largestChangesetHour: initialLargestChangesetHour,
  nodesPerMinute: initialNodesPerMinute,
  newNodesHour: initialNewNodesHour = 0,
  changesetsTrend: initialChangesetsTrend,
}: HomeClientProps) {
  const { colorMode, toggleColorMode } = useColorMode();

  const [newChangesetIds, setNewChangesetIds] = useState<number[]>([]);
  const prevBatchRef = useRef<Changeset[]>([]);
  const [fallingNodes, setFallingNodes] = useState<FallingNode[]>([]);
  const pageContainerRef = useRef<HTMLElement | null>(null);
  const fallingNodeIdRef = useRef(0);
  const particleTimersRef = useRef<number[]>([]);

  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [liveData, setLiveData] = useState<LiveData>({
    changesetBatch: initialChangesetBatch,
    totalNodes: initialTotalNodes,
    totalChangesets: initialTotalChangesets,
    uniqueMappersHour: initialUniqueMappersHour,
    topMappersHour: initialTopMappersHour,
    topCountriesHour: initialTopCountriesHour,
    averageChangesHour: initialAverageChangesHour,
    largestChangesetHour: initialLargestChangesetHour,
    nodesPerMinute: initialNodesPerMinute,
    newNodesHour: initialNewNodesHour,
  });
  const [changesetsTrend, setChangesetsTrend] = useState<ChangesetsTrendPoint[]>(
    initialChangesetsTrend.length > 0
      ? initialChangesetsTrend
      : [{ timestamp: Date.now(), value: initialTotalChangesets }]
  );

  useEffect(() => {
    const socket = io({ path: "/api/socket/io" });

    socket.on("stats", (data: Partial<LiveData>) => {
      setLiveData((prev) => {
        if (!data.changesetBatch) {
          return { ...prev, ...data };
        }

        const mergedBatch = mergeCountryData(data.changesetBatch, prev.changesetBatch);
        const incomingCoverage = getCountryCoverage(mergedBatch);
        const previousCoverage = getCountryCoverage(prev.changesetBatch);

        if (incomingCoverage < 0.2 && previousCoverage > 0.5) {
          return { ...prev, ...data, changesetBatch: prev.changesetBatch };
        }

        return { ...prev, ...data, changesetBatch: mergedBatch };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const previousBatch = prevBatchRef.current;
    const prevIds = new Set(previousBatch.map((cs) => cs.id));
    const prevUsers = new Set(
      previousBatch
        .map((cs) => cs.user?.trim())
        .filter((user): user is string => Boolean(user))
    );

    const incomingChangesets = liveData.changesetBatch.filter((cs) => !prevIds.has(cs.id));
    const ids = incomingChangesets.map((cs) => cs.id);

    setNewChangesetIds(ids);
    prevBatchRef.current = liveData.changesetBatch;

    if (incomingChangesets.length === 0) {
      return undefined;
    }

    const createdParticles: FallingNode[] = [];

    for (const changeset of incomingChangesets) {
      const generatedCount = Math.max(
        1,
        Math.floor(changeset.changes_count / CHANGES_PER_FLAG_PARTICLE)
      );
      const particleCount = Math.min(generatedCount, MAX_FLAGS_PER_CHANGESET);
      const flag = getChangesetFlag(changeset);

      for (let i = 0; i < particleCount; i += 1) {
        if (createdParticles.length >= MAX_FLAGS_PER_TICK) {
          break;
        }

        const placement = pickParticlePlacement(pageContainerRef.current);
        if (!placement) {
          continue;
        }

        fallingNodeIdRef.current += 1;
        createdParticles.push({
          id: fallingNodeIdRef.current,
          kind: "flag",
          glyph: flag,
          leftPercent: placement.leftPercent,
          sizeRem: 1.7 + Math.random() * 1.5,
          durationMs: 5200 + Math.round(Math.random() * 3600),
          delayMs: Math.round(Math.random() * 1200),
          driftPx:
            placement.lane === "left"
              ? -72 + Math.round(Math.random() * 24)
              : 48 + Math.round(Math.random() * 24),
          opacity: 0.62 + Math.random() * 0.34,
          tiltDeg: -14 + Math.round(Math.random() * 28),
          spinDeg: -56 + Math.round(Math.random() * 112),
        });
      }

      if (createdParticles.length >= MAX_FLAGS_PER_TICK) {
        break;
      }
    }

    const newContributors = Array.from(
      new Set(
        incomingChangesets
          .map((cs) => cs.user?.trim())
          .filter(
            (user): user is string =>
              Boolean(user) && user.length > 0 && !prevUsers.has(user)
          )
      )
    ).slice(0, MAX_CONTRIBUTOR_PARTICLES_PER_TICK);

    for (const contributor of newContributors) {
      const placement = pickParticlePlacement(pageContainerRef.current);
      if (!placement) {
        continue;
      }

      fallingNodeIdRef.current += 1;
      createdParticles.push({
        id: fallingNodeIdRef.current,
        kind: "contributor",
        glyph: "🧑",
        label: formatContributorLabel(contributor),
        leftPercent: placement.leftPercent,
        sizeRem: 1.35 + Math.random() * 0.65,
        durationMs: 5600 + Math.round(Math.random() * 3200),
        delayMs: Math.round(Math.random() * 1200),
        driftPx:
          placement.lane === "left"
            ? -66 + Math.round(Math.random() * 22)
            : 44 + Math.round(Math.random() * 22),
        opacity: 0.72 + Math.random() * 0.24,
        tiltDeg: -10 + Math.round(Math.random() * 20),
        spinDeg: -34 + Math.round(Math.random() * 68),
      });
    }

    if (createdParticles.length > 0) {
      setFallingNodes((prev) => [...prev, ...createdParticles].slice(-MAX_ACTIVE_PARTICLES));

      for (const particle of createdParticles) {
        const timeoutId = window.setTimeout(() => {
          setFallingNodes((prev) => prev.filter((item) => item.id !== particle.id));
        }, particle.durationMs + particle.delayMs + 260);
        particleTimersRef.current.push(timeoutId);
      }
    }

    const timer = window.setTimeout(() => setNewChangesetIds([]), 1400);
    return () => {
      window.clearTimeout(timer);
    };
  }, [liveData.changesetBatch]);

  useEffect(() => {
    setChangesetsTrend((prev) => {
      const lastPoint = prev[prev.length - 1];
      if (lastPoint && lastPoint.value === liveData.totalChangesets) {
        return prev;
      }

      const next = [...prev, { timestamp: Date.now(), value: liveData.totalChangesets }];
      return next.slice(-TREND_CLIENT_LIMIT);
    });
  }, [liveData.totalChangesets]);

  useEffect(() => {
    return () => {
      for (const timeoutId of particleTimersRef.current) {
        window.clearTimeout(timeoutId);
      }
      particleTimersRef.current = [];
    };
  }, []);

  async function handleReset() {
    setResetLoading(true);
    setResetSuccess(false);
    setResetError(null);

    try {
      const response = await fetch("/api/reset-stats", { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setResetError(body.error || "Failed to reset stats");
      } else {
        setResetSuccess(true);
      }
    } catch (error: unknown) {
      setResetError(error instanceof Error ? error.message : "Failed to reset stats");
    } finally {
      setResetLoading(false);
      setTimeout(() => setResetSuccess(false), 2200);
    }
  }

  return (
    <div className={styles.appShell}>
      <div className={styles.backgroundArt} aria-hidden />
      <div className={styles.fallingNodesLayer} aria-hidden>
        {fallingNodes.map((particle) => {
          const style = {
            "--node-left": `${particle.leftPercent}%`,
            "--node-size": `${particle.sizeRem}rem`,
            "--node-duration": `${particle.durationMs}ms`,
            "--node-delay": `${particle.delayMs}ms`,
            "--node-drift": `${particle.driftPx}px`,
            "--node-opacity": `${particle.opacity}`,
            "--node-tilt": `${particle.tiltDeg}deg`,
            "--node-spin": `${particle.spinDeg}deg`,
          } as CSSProperties;

          return (
            <span
              key={particle.id}
              className={`${styles.fallingNode} ${
                particle.kind === "contributor"
                  ? styles.fallingContributor
                  : styles.fallingFlag
              }`}
              style={style}
            >
              <span className={styles.fallingNodeGlyph} aria-hidden>
                {particle.glyph}
              </span>
              {particle.label ? (
                <span className={styles.fallingNodeLabel}>{particle.label}</span>
              ) : null}
            </span>
          );
        })}
      </div>

      <main ref={pageContainerRef} className={styles.pageContainer}>
        <header className={styles.hero}>
          <div className={styles.heroMeta}>
            <span className={styles.heroIconWrap}>
              <FaGlobe className={styles.heroIcon} />
            </span>
            <p className={styles.heroTag}>OpenStreetMap Live Analytics</p>
          </div>

          <h1 className={styles.heroTitle}>Node Counter Dashboard</h1>
          <p className={styles.heroSubtitle}>
            Follow global mapping activity in real time with hourly trends and contributor highlights.
          </p>

          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.themeButton}
              onClick={toggleColorMode}
              aria-label={colorMode === "dark" ? "Switch to day theme" : "Switch to night theme"}
            >
              {colorMode === "dark" ? (
                <>
                  <LuSun className={styles.themeIcon} />
                  Day theme
                </>
              ) : (
                <>
                  <LuMoon className={styles.themeIcon} />
                  Night theme
                </>
              )}
            </button>

            <button
              type="button"
              className={styles.resetButton}
              onClick={handleReset}
              disabled={resetLoading}
            >
              {resetLoading ? "Resetting..." : "Reset all stats"}
            </button>

            {resetSuccess && (
              <p className={`${styles.statusChip} ${styles.statusSuccess}`}>Stats reset successfully</p>
            )}

            {resetError && <p className={`${styles.statusChip} ${styles.statusError}`}>{resetError}</p>}
          </div>
        </header>

        <section className={styles.sectionWrap}>
          <p className={styles.sectionLabel}>Global totals</p>
          <StatsSection
            totalNodes={liveData.totalNodes}
            totalChangesets={liveData.totalChangesets}
            nodesPerMinute={liveData.nodesPerMinute}
          />
        </section>

        <section className={styles.sectionWrap}>
          <p className={styles.sectionLabel}>Total changesets</p>
          <TotalChangesetsLineGraph points={changesetsTrend} />
        </section>

        <section className={styles.sectionWrap}>
          <p className={styles.sectionLabel}>Current hour</p>
          <MoreStatsSection
            averageChangesHour={liveData.averageChangesHour}
            largestChangesetHour={liveData.largestChangesetHour}
            uniqueMappersHour={liveData.uniqueMappersHour}
            newNodesHour={liveData.newNodesHour}
          />
        </section>

        <section className={styles.sectionWrap}>
          <p className={styles.sectionLabel}>Country activity</p>
          <CountryChangesWidget topCountriesHour={liveData.topCountriesHour} />
        </section>

        <section className={styles.bottomGrid}>
          <PodiumWidget topMappersHour={liveData.topMappersHour} />
          <ChangesetListWidget
            changesetBatch={liveData.changesetBatch}
            newChangesetIds={newChangesetIds}
          />
        </section>

        <footer className={styles.footerNote}>
          This dashboard is informational and should not be treated as an official OSM metric source.
        </footer>
      </main>
    </div>
  );
}
