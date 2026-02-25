"use client";

import { FiInfo } from "react-icons/fi";
import { Tooltip } from "./ui/tooltip";
import styles from "../app/page.module.css";

interface ChangeQualityWidgetProps {
  commentQualityHour: number;
  commentQualityLastHour: number;
  commentQualityAllTimeHigh: number;
  projectTagsHour: { count: number; topTags: string[] };
  projectTagsLastHour: { count: number; topTags: string[] };
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const delta = current - previous;
  if (delta === 0) return <span className={styles.qualityDeltaNeutral}>—</span>;
  return (
    <span className={delta > 0 ? styles.qualityDeltaUp : styles.qualityDeltaDown}>
      {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}{typeof current === "number" && current <= 100 ? "%" : ""}
    </span>
  );
}

export default function ChangeQualityWidget({
  commentQualityHour,
  commentQualityLastHour,
  commentQualityAllTimeHigh,
  projectTagsHour,
  projectTagsLastHour,
}: ChangeQualityWidgetProps) {
  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div className={styles.statLabelRow}>
          <h2 className={styles.sectionTitle}>Changeset quality</h2>
          <Tooltip content="Comment quality and active mapping projects this hour" showArrow>
            <button className={styles.statInfoBtn} aria-label="More information">
              <FiInfo />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className={styles.qualityGrid}>
        {/* Comment quality card */}
        <div className={styles.qualityCard}>
          <div className={styles.statLabelRow}>
            <p className={styles.statLabel}>Comment quality</p>
            <Tooltip content="Average comment quality score. A comment of 180+ characters scores 100%." showArrow>
              <button className={styles.statInfoBtn} aria-label="More information">
                <FiInfo />
              </button>
            </Tooltip>
          </div>
          <p className={styles.qualityValue}>
            {commentQualityHour === 0 ? "—" : `${commentQualityHour.toFixed(4)}%`}
          </p>
          <div className={styles.qualityBar}>
            <div
              className={styles.qualityBarFill}
              style={{ width: `${commentQualityHour}%` }}
            />
          </div>
          <p className={styles.statCompare}>
            Last hour: {commentQualityLastHour === 0 ? "—" : `${commentQualityLastHour.toFixed(4)}%`}
            {" • "}
            All-time high: {commentQualityAllTimeHigh === 0 ? "—" : `${commentQualityAllTimeHigh.toFixed(4)}%`}
          </p>
        </div>

        {/* Project tags card */}
        <div className={styles.qualityCard}>
          <div className={styles.statLabelRow}>
            <p className={styles.statLabel}>#project count</p>
            <Tooltip content="Distinct hashtags found in changeset comments this hour — each represents a mapping project or campaign." showArrow>
              <button className={styles.statInfoBtn} aria-label="More information">
                <FiInfo />
              </button>
            </Tooltip>
          </div>
          <p className={styles.qualityValue}>{projectTagsHour.count}</p>
          <p className={styles.statCompare}>
            Last hour: {projectTagsLastHour.count} projects
            {" • "}
            <DeltaBadge current={projectTagsHour.count} previous={projectTagsLastHour.count} />
          </p>
          {projectTagsHour.topTags.length > 0 && (
            <div className={styles.qualityTagList}>
              {projectTagsHour.topTags.map((tag) => (
                <span key={tag} className={styles.qualityTag}>#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
