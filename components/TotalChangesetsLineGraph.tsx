import { LTTB } from "downsample";
import styles from "../app/page.module.css";

export interface ChangesetsTrendPoint {
  timestamp: number;
  value: number;
}

interface TotalChangesetsLineGraphProps {
  points: ChangesetsTrendPoint[];
}

const CHART_WIDTH = 900;
const CHART_HEIGHT = 260;
const PAD_X = 22;
const PAD_TOP = 16;
const PAD_BOTTOM = 34;
const MAX_RENDER_POINTS = 420;

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

export default function TotalChangesetsLineGraph({ points }: TotalChangesetsLineGraphProps) {
  const safePoints =
    points.length > 0 ? points : [{ timestamp: Date.now(), value: 0 }];
  const normalizedPoints = [...safePoints]
    .sort((a, b) => a.timestamp - b.timestamp || a.value - b.value)
    .filter((point, index, source) => index === 0 || source[index - 1].timestamp !== point.timestamp);

  const renderPoints = normalizedPoints.length > MAX_RENDER_POINTS
    ? (LTTB(
      normalizedPoints.map((point) => [point.timestamp, point.value] as [number, number]),
      MAX_RENDER_POINTS
    ) as Array<[number, number]>).map(([timestamp, value]) => ({
      timestamp: Number(timestamp),
      value: Number(value),
    }))
    : normalizedPoints;

  const values = renderPoints.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = Math.max(maxValue - minValue, 1);
  const minTimestamp = renderPoints[0]?.timestamp ?? Date.now();
  const maxTimestamp = renderPoints[renderPoints.length - 1]?.timestamp ?? minTimestamp;
  const timestampRange = Math.max(maxTimestamp - minTimestamp, 1);

  const plotWidth = CHART_WIDTH - PAD_X * 2;
  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const coords = renderPoints.map((point) => {
    const x = PAD_X + ((point.timestamp - minTimestamp) / timestampRange) * plotWidth;
    const y =
      PAD_TOP + (1 - (point.value - minValue) / valueRange) * plotHeight;
    return { x, y, value: point.value };
  });

  const linePath = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${
    PAD_TOP + plotHeight
  } L ${coords[0].x} ${PAD_TOP + plotHeight} Z`;

  const current = normalizedPoints[normalizedPoints.length - 1].value;
  const start = normalizedPoints[0].value;
  const delta = current - start;
  const latestCoord = coords[coords.length - 1];

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Total changesets trend</h2>
        <p className={styles.sectionCaption}>
          {renderPoints.length < safePoints.length
            ? `Downsampled ${safePoints.length.toLocaleString()} -> ${renderPoints.length.toLocaleString()}`
            : "Live session line chart"}
        </p>
      </div>

      <div className={styles.lineChartWrap}>
        <svg
          className={styles.lineChartSvg}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label="Total changesets line chart"
        >
          <line
            x1={PAD_X}
            y1={PAD_TOP + plotHeight}
            x2={CHART_WIDTH - PAD_X}
            y2={PAD_TOP + plotHeight}
            className={styles.lineAxis}
          />
          <line
            x1={PAD_X}
            y1={PAD_TOP}
            x2={PAD_X}
            y2={PAD_TOP + plotHeight}
            className={styles.lineAxis}
          />
          <path d={areaPath} className={styles.lineArea} />
          <path d={linePath} className={styles.lineStroke} />
          {latestCoord ? (
            <circle
              cx={latestCoord.x}
              cy={latestCoord.y}
              r={4}
              className={styles.lineDotCurrent}
            />
          ) : null}
        </svg>
      </div>

      <div className={styles.lineChartMeta}>
        <span>Start: {start.toLocaleString()}</span>
        <span>
          Delta: {delta >= 0 ? "+" : ""}
          {delta.toLocaleString()}
        </span>
        <span>Current: {current.toLocaleString()}</span>
      </div>
      <p className={styles.lineChartHint}>
        {formatTime(normalizedPoints[0].timestamp)} to{" "}
        {formatTime(normalizedPoints[normalizedPoints.length - 1].timestamp)}
      </p>
    </section>
  );
}
