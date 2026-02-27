import { Server } from "socket.io";
import { sendOrGetNodeTotal } from "@/actions/create-node-total";
import { sendOrGetChangesetTotal } from "@/actions/create-changeset-total";
import { sendOrGetUniqueMappersHour } from "@/actions/create-unique-mappers-hour";
import { sendOrGetTopMappersHour } from "@/actions/create-top-mappers-hour";
import { sendOrGetTopCountriesHour } from "@/actions/create-top-countries-hour";
import { sendOrGetAverageChangesHour } from "@/actions/create-average-changes-hour";
import { sendOrGetNewNodesHour } from "@/actions/create-new-nodes-hour";
import {
  sendOrGetNodesPerMinute,
  sendOrGetNodesPerMinuteAllTimeHigh,
} from "@/actions/create-nodes-per-minute";
import { sendOrGetNodesPerMinuteTrend } from "@/actions/create-nodes-per-minute-trend";
import { sendOrGetTotalChangesetsTrend } from "@/actions/create-total-changesets-trend";
import { getAllCountryChanges } from "@/actions/get-all-country-changes";
import { sendOrGetProjectTagsHour } from "@/actions/create-project-tags-hour";
import {
  HOURLY_ALL_TIME_HIGH_KEYS,
  sendOrGetHourlyAllTimeHigh,
} from "@/actions/create-hourly-all-time-high";
import { enrichChangesetsWithCountry } from "@/lib/changeset-country";
import { convertXML } from "simple-xml-to-json";
import type { Changeset } from "@/types/changeset";

const STATS_INTERVAL_MS = 6000;
const OSM_CHANGESETS_URL = "https://www.openstreetmap.org/api/0.6/changesets.json?limit=25&closed=true";
const STATS_LOOP_VERSION = "project-and-user-country-flag-v24";
const NODES_PER_MINUTE_SMOOTHING_ALPHA = 0.34;
const NODE_RATE_WINDOW_MS = 90_000;
const NODE_RATE_MIN_ELAPSED_MS = 18_000;
const MAX_TRACKED_CHANGESET_IDS = 5000;
const RATE_HISTORY_LIMIT = 60;
const RATE_OUTLIER_MIN_SAMPLES = 6;
const RATE_OUTLIER_MULTIPLIER = 2.35;
const RATE_OUTLIER_PADDING = 900;
const RATE_MAX_STEP_MULTIPLIER = 1.45;
const RATE_MAX_STEP_PADDING = 420;

function getTopMappers(changesets: Changeset[]): string[] {
  if (!changesets.length) return [];
  const userCounts: Record<string, number> = {};
  changesets.forEach(cs => {
    userCounts[cs.user] = (userCounts[cs.user] || 0) + 1;
  });
  return Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([user]) => user);
}

function getAverageChanges(changesets: Changeset[]): number {
  if (!changesets.length) return 0;
  const total = changesets.reduce((sum: number, cs: Changeset) => sum + cs.changes_count, 0);
  return Math.round(total / changesets.length);
}

async function getLatestChangesets() {
  const response = await fetch(OSM_CHANGESETS_URL, { cache: "no-store" });
  const response_data = await response.json();
  return enrichChangesetsWithCountry(response_data["changesets"] as Changeset[]);
}

function toPositiveInteger(value: unknown): number | null {
  const asNumber = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(asNumber) || asNumber <= 0) {
    return null;
  }
  return Math.floor(asNumber);
}

function getMedian(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function capInstantRateByBaseline(rate: number, history: number[]) {
  if (history.length < RATE_OUTLIER_MIN_SAMPLES) {
    return rate;
  }

  const recent = history.slice(-RATE_HISTORY_LIMIT);
  const median = getMedian(recent);
  if (median <= 0) {
    return rate;
  }

  const dynamicCap = Math.round(
    Math.max(median * RATE_OUTLIER_MULTIPLIER, median + RATE_OUTLIER_PADDING)
  );
  return Math.min(rate, dynamicCap);
}

function capInstantRateByStep(rate: number, currentSmoothed: number) {
  if (!Number.isFinite(currentSmoothed) || currentSmoothed <= 0) {
    return rate;
  }

  const stepCap = Math.round(
    currentSmoothed * RATE_MAX_STEP_MULTIPLIER + RATE_MAX_STEP_PADDING
  );
  return Math.min(rate, stepCap);
}

async function getlatestTotalNodesInfo(arg: Changeset | any[] | null): Promise<{ latestTotalNodes: number | null }> {
  let details = null;

  if (Array.isArray(arg)) {
    details = arg;
  } else if (arg && typeof arg === 'object' && 'id' in arg) {
    try {
      const response = await fetch(
        `https://www.openstreetmap.org/api/0.6/changeset/${arg.id}/download`
      );
      if (response.ok) {
        const xml_string = await response.text();
        details = convertXML(xml_string).osmChange.children;
      } else {
        const text = await response.text();
        console.warn(`Failed to fetch changeset download for ${arg.id}: ${text}`);
        return { latestTotalNodes: null };
      }
    } catch (err) {
      console.warn(`Error fetching changeset download for ${arg.id}:`, err);
      return { latestTotalNodes: null };
    }
  }
  if (!details || !Array.isArray(details)) return { latestTotalNodes: null, };
  let lastNode = null;
  for (let i = 0; i < details.length; i++) {
    const block = details[i];
    if (block.create && Array.isArray(block.create.children)) {
      const createChildren = block.create.children;
      for (let j = 0; j < createChildren.length; j++) {
        if (createChildren[j].node) {
          lastNode = createChildren[j].node;
        }
      }
    }
  }
  return { latestTotalNodes: toPositiveInteger(lastNode?.id) };
}

function clearLegacyStatsIntervals(currentInterval?: NodeJS.Timeout) {
  const processWithHandles = process as NodeJS.Process & {
    _getActiveHandles?: () => unknown[];
  };

  const handles = processWithHandles._getActiveHandles?.();
  if (!handles) {
    return;
  }

  let clearedCount = 0;
  for (const handle of handles) {
    const timeoutHandle = handle as NodeJS.Timeout & {
      _repeat?: number;
      _onTimeout?: unknown;
    };

    if (timeoutHandle === currentInterval) {
      continue;
    }

    if (timeoutHandle._repeat !== STATS_INTERVAL_MS) {
      continue;
    }

    const timeoutFn = timeoutHandle._onTimeout;
    if (typeof timeoutFn !== "function") {
      continue;
    }

    const fnBody = Function.prototype.toString.call(timeoutFn);
    const looksLikeStatsLoop =
      fnBody.includes("sendOrGetNodeTotal") ||
      fnBody.includes("sendOrGetChangesetTotal") ||
      fnBody.includes("io.emit(\"stats\"");

    if (!looksLikeStatsLoop) {
      continue;
    }

    clearInterval(timeoutHandle);
    clearedCount += 1;
  }

  if (clearedCount > 0) {
    console.log(`Cleared ${clearedCount} legacy stats interval(s).`);
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  type SocketServerWithState = typeof res.socket.server & {
    io?: Server;
    statsInterval?: NodeJS.Timeout;
    statsIntervalVersion?: string;
  };

  const socketServer = res.socket.server as SocketServerWithState;

  if (!socketServer.io) {
    socketServer.io = new Server(res.socket.server, {
      path: "/api/socket/io",
      addTrailingSlash: false,
      cors: { origin: "*" }
    });
    console.log("Socket.io server started at /api/socket/io");
  }

  const io = socketServer.io;
  if (!io) {
    res.end();
    return;
  }

  clearLegacyStatsIntervals(socketServer.statsInterval);

  const shouldRestartInterval =
    socketServer.statsIntervalVersion !== STATS_LOOP_VERSION || !socketServer.statsInterval;

  if (shouldRestartInterval) {
    if (socketServer.statsInterval) {
      clearInterval(socketServer.statsInterval);
    }

    let tickInProgress = false;
    let smoothedNodesPerMinute = await sendOrGetNodesPerMinute();
    let rateSamples: Array<{ timestampMs: number; changes: number }> = [];
    let rateHistory: number[] = [];
    let seenChangesetIdsPrimed = false;
    const seenChangesetIds = new Set<number>();
    const seenChangesetQueue: number[] = [];

    socketServer.statsInterval = setInterval(async () => {
      if (tickInProgress) {
        return;
      }

      tickInProgress = true;
      try {
        const changesetBatch: Changeset[] = await getLatestChangesets();
        const totalChangesets = changesetBatch.length > 0 ? changesetBatch[0].id : 0;
        const previousTotalNodes = await sendOrGetNodeTotal();

        const latestChangeset = changesetBatch[0];
        const { latestTotalNodes } = latestChangeset
          ? await getlatestTotalNodesInfo(latestChangeset)
          : { latestTotalNodes: null };

        const nowMs = Date.now();
        let changesInThisTick = 0;

        if (!seenChangesetIdsPrimed) {
          for (const cs of changesetBatch) {
            if (seenChangesetIds.has(cs.id)) {
              continue;
            }
            seenChangesetIds.add(cs.id);
            seenChangesetQueue.push(cs.id);
          }
          seenChangesetIdsPrimed = true;
        } else {
          for (const cs of changesetBatch) {
            if (seenChangesetIds.has(cs.id)) {
              continue;
            }

            seenChangesetIds.add(cs.id);
            seenChangesetQueue.push(cs.id);
            changesInThisTick += Math.max(cs.changes_count, 0);

            if (seenChangesetQueue.length > MAX_TRACKED_CHANGESET_IDS) {
              const removedId = seenChangesetQueue.shift();
              if (removedId !== undefined) {
                seenChangesetIds.delete(removedId);
              }
            }
          }
        }

        const totalNodes = latestTotalNodes !== null
          ? Math.max(latestTotalNodes, previousTotalNodes)
          : previousTotalNodes;
        const newHourlyTotalNodes = Math.max(totalNodes - previousTotalNodes, 0);

        rateSamples.push({ timestampMs: nowMs, changes: changesInThisTick });
        const cutoffMs = nowMs - NODE_RATE_WINDOW_MS;
        rateSamples = rateSamples.filter((sample) => sample.timestampMs >= cutoffMs);

        if (rateSamples.length >= 2) {
          const first = rateSamples[0];
          const elapsedMs = nowMs - first.timestampMs;
          if (elapsedMs >= NODE_RATE_MIN_ELAPSED_MS) {
            const changesInWindow = rateSamples.reduce((sum, sample) => sum + sample.changes, 0);
            const rawInstantRate = Math.round((changesInWindow * 60000) / elapsedMs);
            if (Number.isFinite(rawInstantRate) && rawInstantRate >= 0) {
              let stabilizedInstantRate = capInstantRateByBaseline(rawInstantRate, rateHistory);
              stabilizedInstantRate = capInstantRateByStep(
                stabilizedInstantRate,
                smoothedNodesPerMinute
              );

              rateHistory.push(stabilizedInstantRate);
              if (rateHistory.length > RATE_HISTORY_LIMIT) {
                rateHistory = rateHistory.slice(-RATE_HISTORY_LIMIT);
              }

              if (smoothedNodesPerMinute <= 0) {
                smoothedNodesPerMinute = stabilizedInstantRate;
              } else {
                smoothedNodesPerMinute = Math.round(
                  smoothedNodesPerMinute * (1 - NODES_PER_MINUTE_SMOOTHING_ALPHA) +
                  stabilizedInstantRate * NODES_PER_MINUTE_SMOOTHING_ALPHA
                );
              }
            }
          }
        }

        const nodesPerMinute = Math.max(smoothedNodesPerMinute, 0);
        const persistedNodesPerMinute = await sendOrGetNodesPerMinute(nodesPerMinute);
        const nodesPerMinuteAllTimeHigh = await sendOrGetNodesPerMinuteAllTimeHigh();
        await sendOrGetNodesPerMinuteTrend(persistedNodesPerMinute, nowMs);


        // Persist fresh stats in SQL storage
        if (previousTotalNodes > 0 && newHourlyTotalNodes > 0) {
          await sendOrGetNewNodesHour(newHourlyTotalNodes);
        }

        await sendOrGetNodeTotal(totalNodes);
        await sendOrGetChangesetTotal(totalChangesets);
        await sendOrGetTotalChangesetsTrend(totalChangesets);

        for (const user of Array.from(new Set(changesetBatch.map((cs: Changeset) => cs.user)))) {
          await sendOrGetUniqueMappersHour(user as string);
        }

        for (const cs of changesetBatch) {
          await sendOrGetTopMappersHour(
            cs.user,
            cs.changes_count,
            cs.id,
            0,
            cs.countryCode ?? null
          );
          await sendOrGetTopCountriesHour(cs.countryCode ?? null, cs.changes_count, cs.id);
          await sendOrGetAverageChangesHour(cs.user, cs.changes_count);
          const comment = cs.tags?.comment ?? "";
          await sendOrGetProjectTagsHour(
            cs.id,
            comment,
            0,
            cs.changes_count,
            cs.countryCode ?? null
          );
        }

        const topMappersHour = await sendOrGetTopMappersHour();
        const topMappersLastHour = await sendOrGetTopMappersHour(null, 1, null, -1);
        const topCountriesHour = await sendOrGetTopCountriesHour();
        const topCountriesLastHour = await sendOrGetTopCountriesHour(null, 1, null, -1);
        const averageChangesHour = await sendOrGetAverageChangesHour();
        const averageChangesLastHour = await sendOrGetAverageChangesHour(null, null, -1);
        const uniqueMappersHour = await sendOrGetUniqueMappersHour();
        const uniqueMappersLastHour = await sendOrGetUniqueMappersHour(null, -1);
        const newNodesHour = await sendOrGetNewNodesHour();
        const newNodesLastHour = await sendOrGetNewNodesHour(null, -1);
        const allCountryChanges = await getAllCountryChanges();
        const projectTagsHour = await sendOrGetProjectTagsHour();
        const projectTagsLastHour = await sendOrGetProjectTagsHour(null, null, -1);
        const uniqueMappersAllTimeHigh = await sendOrGetHourlyAllTimeHigh(
          HOURLY_ALL_TIME_HIGH_KEYS.uniqueMappersHour,
          uniqueMappersHour
        );
        const averageChangesAllTimeHigh = await sendOrGetHourlyAllTimeHigh(
          HOURLY_ALL_TIME_HIGH_KEYS.averageChangesHour,
          averageChangesHour
        );
        const newNodesAllTimeHigh = await sendOrGetHourlyAllTimeHigh(
          HOURLY_ALL_TIME_HIGH_KEYS.newNodesHour,
          newNodesHour
        );
        const activeCountriesAllTimeHigh = await sendOrGetHourlyAllTimeHigh(
          HOURLY_ALL_TIME_HIGH_KEYS.activeCountriesHour,
          topCountriesHour.length
        );
        const projectTagsAllTimeHigh = await sendOrGetHourlyAllTimeHigh(
          HOURLY_ALL_TIME_HIGH_KEYS.projectTagsHour,
          projectTagsHour.count
        );
        const topMappersLeaderAllTimeHigh = await sendOrGetHourlyAllTimeHigh(
          HOURLY_ALL_TIME_HIGH_KEYS.topMapperLeaderHour,
          topMappersHour[0]?.count ?? 0
        );
        const topCountriesLeaderAllTimeHigh = await sendOrGetHourlyAllTimeHigh(
          HOURLY_ALL_TIME_HIGH_KEYS.topCountryLeaderHour,
          topCountriesHour[0]?.count ?? 0
        );

        io.emit("stats", {
          changesetBatch: enrichChangesetsWithCountry(changesetBatch),
          totalChanges: await sendOrGetNodeTotal(),
          totalChangesets,
          uniqueMappersHour,
          uniqueMappersLastHour,
          uniqueMappersAllTimeHigh,
          topMappersHour,
          topMappersLastHour,
          topMappersLeaderAllTimeHigh,
          topCountriesHour,
          topCountriesLastHour,
          topCountriesLeaderAllTimeHigh,
          averageChangesHour,
          averageChangesLastHour,
          averageChangesAllTimeHigh,
          changesPerMinute: persistedNodesPerMinute,
          changesPerMinuteAllTimeHigh: nodesPerMinuteAllTimeHigh,
          topMappersBatch: getTopMappers(changesetBatch),
          averageChangesBatch: getAverageChanges(changesetBatch),
          newNodesHour,
          newNodesLastHour,
          newNodesAllTimeHigh,
          activeCountriesAllTimeHigh,
          allCountryChanges,
          projectTagsHour,
          projectTagsLastHour,
          projectTagsAllTimeHigh,
          statsTimestampMs: nowMs,
        });
      } catch (error) {
        console.error("Failed to publish live stats:", error);
      } finally {
        tickInProgress = false;
      }
    }, STATS_INTERVAL_MS);

    socketServer.statsIntervalVersion = STATS_LOOP_VERSION;
  }

  res.end();
}
