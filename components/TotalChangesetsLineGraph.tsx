"use client";

import { useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "../app/page.module.css";

export interface ChangesetsTrendPoint {
  timestamp: number;
  value: number;
}

interface TotalChangesetsLineGraphProps {
  points: ChangesetsTrendPoint[];
  secondaryPoints?: ChangesetsTrendPoint[];
  title?: string;
  subtitle?: string;
  ariaLabel?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryValueUnit?: string;
  secondaryValueUnit?: string;
}

interface ChartRow {
  timestamp: number;
  primary: number | null;
  secondary: number | null;
}

interface HoverState {
  timestamp: number;
  primary: number | null;
  secondary: number | null;
}

const CHART_HEIGHT = 280;
const MAX_RENDER_POINTS = 420;
const EXPECTED_SAMPLE_INTERVAL_MS = 6000;
const SESSION_GAP_THRESHOLD_MS = 30 * 1000;

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

function formatAxisTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function formatValue(value: number, unit?: string) {
  const formatted = value.toLocaleString();
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatAxisValue(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const abs = Math.abs(value);
  if (abs < 1000) {
    return Math.round(value).toLocaleString();
  }

  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function getNiceDomain(min: number, max: number, includeZero = false) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [0, 1] as const;
  }

  const rawMin = includeZero ? Math.min(0, min) : min;
  const rawMax = includeZero ? Math.max(0, max) : max;
  const normalizedMax = Math.max(rawMax, rawMin + 1);
  const range = normalizedMax - rawMin;
  const rawStep = range / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(rawStep, 1))));
  const normalized = rawStep / magnitude;

  let step = magnitude;
  if (normalized > 5) {
    step = 10 * magnitude;
  } else if (normalized > 2) {
    step = 5 * magnitude;
  } else if (normalized > 1) {
    step = 2 * magnitude;
  }

  const niceMin = Math.floor(rawMin / step) * step;
  const niceMax = Math.ceil(normalizedMax / step) * step;
  const fixedNiceMin = includeZero ? Math.min(niceMin, 0) : niceMin;
  return [fixedNiceMin, Math.max(niceMax, fixedNiceMin + step)] as const;
}

function quantile(sortedValues: number[], q: number) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const clampedQ = Math.max(0, Math.min(1, q));
  const index = (sortedValues.length - 1) * clampedQ;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sortedValues[lower];
  }

  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function normalizePoints(points: ChangesetsTrendPoint[]) {
  const safePoints = points.length > 0 ? points : [{ timestamp: Date.now(), value: 0 }];
  const sorted = [...safePoints].sort(
    (a, b) => a.timestamp - b.timestamp || a.value - b.value
  );

  const deduplicated: ChangesetsTrendPoint[] = [];
  for (const point of sorted) {
    const last = deduplicated[deduplicated.length - 1];
    if (!last || last.timestamp !== point.timestamp) {
      deduplicated.push(point);
      continue;
    }

    deduplicated[deduplicated.length - 1] = point;
  }

  return deduplicated;
}

function downsamplePoints(points: ChangesetsTrendPoint[]) {
  if (points.length <= MAX_RENDER_POINTS) {
    return points;
  }

  const startTimestamp = points[0].timestamp;
  const endTimestamp = points[points.length - 1].timestamp;
  const totalRange = endTimestamp - startTimestamp;
  if (totalRange <= 0) {
    return points.slice(0, MAX_RENDER_POINTS);
  }

  const bucketSize = totalRange / (MAX_RENDER_POINTS - 1);
  const buckets: Array<ChangesetsTrendPoint | null> = new Array(MAX_RENDER_POINTS).fill(null);

  for (const point of points) {
    const bucketIndex = Math.min(
      MAX_RENDER_POINTS - 1,
      Math.floor((point.timestamp - startTimestamp) / bucketSize)
    );
    const existing = buckets[bucketIndex];
    if (!existing || point.timestamp > existing.timestamp) {
      buckets[bucketIndex] = point;
    }
  }

  const sampled: ChangesetsTrendPoint[] = [];
  for (const candidate of buckets) {
    if (!candidate) {
      continue;
    }

    const previous = sampled[sampled.length - 1];
    if (!previous || previous.timestamp !== candidate.timestamp) {
      sampled.push(candidate);
    }
  }

  const first = points[0];
  const last = points[points.length - 1];
  if (sampled[0]?.timestamp !== first.timestamp) {
    sampled.unshift(first);
  }
  if (sampled[sampled.length - 1]?.timestamp !== last.timestamp) {
    sampled.push(last);
  }

  if (sampled.length > MAX_RENDER_POINTS) {
    return [...sampled.slice(0, MAX_RENDER_POINTS - 1), last];
  }

  return sampled;
}

function selectLatestContinuousSegment(
  points: ChangesetsTrendPoint[],
  gapThresholdMs: number = SESSION_GAP_THRESHOLD_MS
) {
  if (points.length < 2) {
    return points;
  }

  let startIndex = 0;
  for (let index = points.length - 1; index > 0; index -= 1) {
    const gapMs = points[index].timestamp - points[index - 1].timestamp;
    if (gapMs > gapThresholdMs) {
      startIndex = index;
      break;
    }
  }

  return points.slice(startIndex);
}

export default function TotalChangesetsLineGraph({
  points,
  secondaryPoints = [],
  title = "Total changesets trend",
  subtitle = "Live session dual line chart",
  ariaLabel = "Total changesets and nodes per minute line chart",
  primaryLabel = "Changesets",
  secondaryLabel = "Nodes/min",
  primaryValueUnit,
  secondaryValueUnit = "nodes/min",
}: TotalChangesetsLineGraphProps) {
  const gradientId = useId().replace(/:/g, "");

  const normalizedPrimary = useMemo(() => normalizePoints(points), [points]);
  const normalizedSecondary = useMemo(
    () => (secondaryPoints.length > 0 ? normalizePoints(secondaryPoints) : []),
    [secondaryPoints]
  );
  const segmentedPrimary = useMemo(
    () => selectLatestContinuousSegment(normalizedPrimary),
    [normalizedPrimary]
  );
  const segmentedSecondary = useMemo(
    () => (normalizedSecondary.length > 0 ? selectLatestContinuousSegment(normalizedSecondary) : []),
    [normalizedSecondary]
  );

  const primaryRenderPoints = useMemo(
    () => downsamplePoints(segmentedPrimary),
    [segmentedPrimary]
  );
  const hasSecondarySeries = segmentedSecondary.length > 0;
  const secondaryRenderPoints = useMemo(
    () => (hasSecondarySeries ? downsamplePoints(segmentedSecondary) : []),
    [segmentedSecondary, hasSecondarySeries]
  );

  const isPrimaryDownsampled = primaryRenderPoints.length < segmentedPrimary.length;
  const isSecondaryDownsampled = secondaryRenderPoints.length < segmentedSecondary.length;
  const detectedPrimaryGaps = segmentedPrimary.reduce((count, point, index, source) => {
    if (index === 0) {
      return count;
    }

    const gapMs = point.timestamp - source[index - 1].timestamp;
    if (gapMs > SESSION_GAP_THRESHOLD_MS) {
      return count + 1;
    }
    return count;
  }, 0);

  const primaryValues = primaryRenderPoints.map((point) => point.value);
  const primaryMinRaw = Math.min(...primaryValues);
  const primaryMaxRaw = Math.max(...primaryValues);

  let primaryDomainMin = primaryMinRaw;
  let primaryDomainMax = primaryMaxRaw;
  const shouldUseRobustPrimaryScale = !hasSecondarySeries && primaryRenderPoints.length >= 30;

  if (shouldUseRobustPrimaryScale) {
    const sortedPrimaryValues = [...primaryValues].sort((a, b) => a - b);
    const q05 = quantile(sortedPrimaryValues, 0.05);
    const q95 = quantile(sortedPrimaryValues, 0.95);
    const robustRange = q95 - q05;

    if (robustRange > 0) {
      const padding = robustRange * 0.12;
      const robustMin = q05 - padding;
      const robustMax = q95 + padding;
      const normalizedRobustMin = Math.max(0, robustMin);

      if (
        robustMax > normalizedRobustMin &&
        robustMax < primaryMaxRaw &&
        robustRange / Math.max(primaryMaxRaw - primaryMinRaw, 1) < 0.92
      ) {
        primaryDomainMin = normalizedRobustMin;
        primaryDomainMax = robustMax;
      }
    }
  }

  const safePrimaryDomainMax =
    primaryDomainMax <= primaryDomainMin ? primaryDomainMin + 1 : primaryDomainMax;
  const [primaryAxisMin, primaryAxisMax] = getNiceDomain(primaryDomainMin, safePrimaryDomainMax);

  const secondaryValues = secondaryRenderPoints.map((point) => point.value);
  const secondaryMinRaw = secondaryValues.length > 0 ? Math.min(...secondaryValues) : 0;
  const secondaryMaxRaw = secondaryValues.length > 0 ? Math.max(...secondaryValues) : 1;
  const safeSecondaryDomainMax =
    secondaryMaxRaw <= secondaryMinRaw ? secondaryMinRaw + 1 : secondaryMaxRaw;
  const [secondaryAxisMin, secondaryAxisMax] = getNiceDomain(secondaryMinRaw, safeSecondaryDomainMax);

  const clippedPrimaryCount = primaryRenderPoints.reduce((count, point) => {
    if (point.value < primaryDomainMin || point.value > safePrimaryDomainMax) {
      return count + 1;
    }
    return count;
  }, 0);

  const primaryByTimestamp = new Map<number, number>();
  const primaryRawByTimestamp = new Map<number, number>();
  for (const point of primaryRenderPoints) {
    const clamped = Math.min(Math.max(point.value, primaryDomainMin), safePrimaryDomainMax);
    primaryByTimestamp.set(point.timestamp, clamped);
    primaryRawByTimestamp.set(point.timestamp, point.value);
  }

  const secondaryByTimestamp = new Map<number, number>();
  const secondaryRawByTimestamp = new Map<number, number>();
  for (const point of secondaryRenderPoints) {
    secondaryByTimestamp.set(point.timestamp, point.value);
    secondaryRawByTimestamp.set(point.timestamp, point.value);
  }

  const chartRows: ChartRow[] = Array.from(
    new Set([...primaryByTimestamp.keys(), ...secondaryByTimestamp.keys()])
  )
    .sort((a, b) => a - b)
    .map((timestamp) => ({
      timestamp,
      primary: primaryByTimestamp.get(timestamp) ?? null,
      secondary: secondaryByTimestamp.get(timestamp) ?? null,
    }));

  const primaryCurrent = segmentedPrimary[segmentedPrimary.length - 1].value;
  const primaryStart = segmentedPrimary[0].value;
  const primaryDelta = primaryCurrent - primaryStart;
  const secondaryCurrent = hasSecondarySeries
    ? segmentedSecondary[segmentedSecondary.length - 1].value
    : null;

  const [hoverState, setHoverState] = useState<HoverState | null>(null);

  const handleChartMouseMove = (state: {
    activeLabel?: unknown;
    activePayload?: Array<{ dataKey?: string; value?: unknown }>;
  }) => {
    if (!state || typeof state.activeLabel !== "number" || !Array.isArray(state.activePayload)) {
      return;
    }

    const timestamp = state.activeLabel;
    const hoverPrimary = primaryRawByTimestamp.get(timestamp) ?? null;
    const hoverSecondary = secondaryRawByTimestamp.get(timestamp) ?? null;

    setHoverState({
      timestamp,
      primary: hoverPrimary,
      secondary: hoverSecondary,
    });
  };

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <p className={styles.sectionCaption}>
          {isPrimaryDownsampled || isSecondaryDownsampled
            ? hasSecondarySeries
              ? `Showing sampled view (${primaryRenderPoints.length.toLocaleString()} + ${secondaryRenderPoints.length.toLocaleString()} points)`
              : `Showing sampled view (${primaryRenderPoints.length.toLocaleString()} points)`
            : subtitle}
        </p>
      </div>

      <div className={styles.lineLegend}>
        <span className={styles.lineLegendItem}>
          <span className={styles.lineLegendSwatchPrimary} aria-hidden />
          {primaryLabel}
        </span>
        {hasSecondarySeries ? (
          <span className={styles.lineLegendItem}>
            <span className={styles.lineLegendSwatchSecondary} aria-hidden />
            {secondaryLabel}
          </span>
        ) : null}
      </div>

      <div className={styles.lineChartWrap}>
        <div className={styles.lineChartCanvas} role="img" aria-label={ariaLabel}>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <AreaChart
              data={chartRows}
              baseValue="dataMin"
              margin={{ top: 10, right: hasSecondarySeries ? 24 : 12, left: 8, bottom: 8 }}
              onMouseMove={handleChartMouseMove}
              onMouseLeave={() => setHoverState(null)}
            >
              <defs>
                <linearGradient id={`${gradientId}-primary`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--line-primary)" stopOpacity={0.36} />
                  <stop offset="100%" stopColor="var(--line-primary)" stopOpacity={0.07} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="3 4"
                vertical={false}
                className={styles.lineRechartsGrid}
              />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={formatAxisTime}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border-strong)" }}
                tickLine={{ stroke: "var(--border-strong)" }}
                minTickGap={28}
              />
              <YAxis
                yAxisId="left"
                domain={[primaryAxisMin, primaryAxisMax]}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border-strong)" }}
                tickLine={{ stroke: "var(--border-strong)" }}
                width={52}
                tickMargin={6}
                tickCount={5}
                allowDataOverflow
                tickFormatter={formatAxisValue}
              />

              {hasSecondarySeries ? (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[secondaryAxisMin, secondaryAxisMax]}
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--border-strong)" }}
                  tickLine={{ stroke: "var(--border-strong)" }}
                  width={52}
                  tickMargin={6}
                  tickCount={5}
                  tickFormatter={formatAxisValue}
                />
              ) : null}

              <Tooltip
                cursor={{ stroke: "var(--line-guide)", strokeDasharray: "4 5" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0 || typeof label !== "number") {
                    return null;
                  }

                  const primaryEntry = payload.find((entry) => entry.dataKey === "primary");
                  const secondaryEntry = payload.find((entry) => entry.dataKey === "secondary");
                  const rawPrimaryValue = primaryRawByTimestamp.get(label) ?? Number(primaryEntry?.value ?? 0);
                  const rawSecondaryValue = secondaryRawByTimestamp.get(label) ?? Number(secondaryEntry?.value ?? 0);

                  return (
                    <div className={styles.lineTooltipCard}>
                      <p className={styles.lineTooltipTime}>{formatTime(label)}</p>
                      {primaryEntry ? (
                        <p className={styles.lineTooltipValuePrimary}>
                          {primaryLabel}: {formatValue(rawPrimaryValue, primaryValueUnit)}
                        </p>
                      ) : null}
                      {secondaryEntry ? (
                        <p className={styles.lineTooltipValueSecondary}>
                          {secondaryLabel}: {formatValue(rawSecondaryValue, secondaryValueUnit)}
                        </p>
                      ) : null}
                    </div>
                  );
                }}
              />

              <Area
                yAxisId="left"
                type="monotone"
                dataKey="primary"
                connectNulls
                stroke="var(--line-primary)"
                strokeWidth={3}
                fill={`url(#${gradientId}-primary)`}
                dot={false}
                activeDot={{ r: 4, stroke: "var(--surface-strong)", strokeWidth: 2 }}
              />

              {hasSecondarySeries ? (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="secondary"
                  connectNulls
                  stroke="var(--line-secondary)"
                  strokeWidth={2.7}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 4, stroke: "var(--surface-strong)", strokeWidth: 2 }}
                />
              ) : null}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.lineChartMeta}>
        <span>{primaryLabel} start: {formatValue(primaryStart, primaryValueUnit)}</span>
        <span>
          {primaryLabel} delta: {primaryDelta >= 0 ? "+" : ""}
          {formatValue(primaryDelta, primaryValueUnit)}
        </span>
        <span>{primaryLabel} current: {formatValue(primaryCurrent, primaryValueUnit)}</span>
        {secondaryCurrent !== null ? (
          <span>
            {secondaryLabel} current: {formatValue(secondaryCurrent, secondaryValueUnit)}
          </span>
        ) : null}
      </div>

      <p className={styles.lineChartHint}>
        {formatTime(segmentedPrimary[0].timestamp)} to{" "}
        {formatTime(segmentedPrimary[segmentedPrimary.length - 1].timestamp)}
        {detectedPrimaryGaps > 0
          ? ` • ${detectedPrimaryGaps.toLocaleString()} data gap${
              detectedPrimaryGaps === 1 ? "" : "s"
            } detected`
          : ""}
        {clippedPrimaryCount > 0
          ? ` • Scaled for readability (${clippedPrimaryCount.toLocaleString()} outlier${
              clippedPrimaryCount === 1 ? "" : "s"
            } clipped)`
          : ""}
      </p>

      <p className={styles.lineChartInspect}>
        {hoverState
          ? `${formatTime(hoverState.timestamp)} • ${primaryLabel} ${formatValue(
              hoverState.primary ?? primaryCurrent,
              primaryValueUnit
            )}${
              hasSecondarySeries
                ? ` • ${secondaryLabel} ${formatValue(
                    hoverState.secondary ?? secondaryCurrent ?? 0,
                    secondaryValueUnit
                  )}`
                : ""
            }`
          : "Hover the chart to inspect exact values at any point."}
      </p>
    </section>
  );
}
