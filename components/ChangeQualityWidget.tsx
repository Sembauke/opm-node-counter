"use client";

import Link from "next/link";
import { FiInfo } from "react-icons/fi";
import { Tooltip } from "./ui/tooltip";
import styles from "../app/page.module.css";

interface ChangeQualityWidgetProps {
  projectTagsHour: { count: number; topTags: string[] };
  projectTagsLastHour: { count: number; topTags: string[] };
  projectTagsAllTimeHigh: number;
}

export default function ChangeQualityWidget({
  projectTagsHour,
  projectTagsLastHour,
  projectTagsAllTimeHigh,
}: ChangeQualityWidgetProps) {
  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div className={styles.statLabelRow}>
          <h2 className={styles.sectionTitle}>Project activity</h2>
          <Tooltip content="Distinct project hashtags detected in changeset comments this hour" showArrow>
            <button className={styles.statInfoBtn} aria-label="More information">
              <FiInfo />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className={styles.qualityGrid}>
        <div className={`${styles.qualityCard} ${styles.qualityProjectCard}`}>
          <div className={styles.statLabelRow}>
            <p className={styles.statLabel}>#project count</p>
            <Tooltip content="Distinct hashtags found in changeset comments this hour — each represents a mapping project or campaign." showArrow>
              <button className={styles.statInfoBtn} aria-label="More information">
                <FiInfo />
              </button>
            </Tooltip>
          </div>
          <p className={`${styles.qualityValue} ${styles.qualityProjectValue}`}>{projectTagsHour.count}</p>
          <p className={styles.statCompare}>
            Last hour: {projectTagsLastHour.count} projects
            {" • "}
            All-time high: {projectTagsAllTimeHigh.toLocaleString()} projects
          </p>
          {projectTagsHour.topTags.length > 0 && (
            <div className={styles.qualityTagList}>
              {projectTagsHour.topTags.map((tag) => (
                <span key={tag} className={styles.qualityTag}>#{tag}</span>
              ))}
            </div>
          )}
          <div className={styles.qualityAllLink}>
            <Link href="/projects" className={styles.qualityAllButton}>
              View all projects
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
