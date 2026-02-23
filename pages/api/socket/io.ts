import { Server } from "socket.io";
import { sendOrGetNodeTotal } from "@/actions/create-node-total";
import { sendOrGetChangesetTotal } from "@/actions/create-changeset-total";
import { sendOrGetUniqueMappersHour } from "@/actions/create-unique-mappers-hour";
import { sendOrGetTopMappersHour } from "@/actions/create-top-mappers-hour";
import { sendOrGetTopCountriesHour } from "@/actions/create-top-countries-hour";
import { sendOrGetAverageChangesHour } from "@/actions/create-average-changes-hour";
import { sendOrGetLargestChangesetHour } from "@/actions/create-largest-changeset-hour";
import { sendOrGetNewNodesHour } from "@/actions/create-new-nodes-hour";
import { sendOrGetNodesPerMinute } from "@/actions/create-nodes-per-minute";
import { sendOrGetTotalChangesetsTrend } from "@/actions/create-total-changesets-trend";
import { enrichChangesetsWithCountry } from "@/lib/changeset-country";
import { convertXML } from "simple-xml-to-json";
import type { Changeset } from "@/types/changeset";

const STATS_INTERVAL_MS = 6000;
const OSM_CHANGESETS_URL = "https://www.openstreetmap.org/api/0.6/changesets.json?limit=25&closed=true";
const STATS_LOOP_VERSION = "country-flags-v10";
const NODES_PER_MINUTE_SMOOTHING_ALPHA = 0.34;
const NODE_RATE_WINDOW_MS = 90_000;
const NODE_RATE_MIN_ELAPSED_MS = 18_000;
const MAX_TRACKED_CHANGESET_IDS = 5000;

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

function getLargestChangeset(changesets: Changeset[]): number {
  if (!changesets.length) return 0;
  return changesets.reduce((max: Changeset, cs: Changeset) => cs.changes_count > max.changes_count ? cs : max, changesets[0]).changes_count;
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

        const totalNodes = latestTotalNodes !== null
          ? latestTotalNodes
          : previousTotalNodes;
        const newHourlyTotalNodes = Math.max(totalNodes - previousTotalNodes, 0);
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

        rateSamples.push({ timestampMs: nowMs, changes: changesInThisTick });
        const cutoffMs = nowMs - NODE_RATE_WINDOW_MS;
        rateSamples = rateSamples.filter((sample) => sample.timestampMs >= cutoffMs);

        if (rateSamples.length >= 2) {
          const first = rateSamples[0];
          const elapsedMs = nowMs - first.timestampMs;
          if (elapsedMs >= NODE_RATE_MIN_ELAPSED_MS) {
            const changesInWindow = rateSamples.reduce((sum, sample) => sum + sample.changes, 0);
            const instantRate = Math.round((changesInWindow * 60000) / elapsedMs);
            if (Number.isFinite(instantRate) && instantRate >= 0) {
              if (smoothedNodesPerMinute <= 0) {
                smoothedNodesPerMinute = instantRate;
              } else {
                smoothedNodesPerMinute = Math.round(
                  smoothedNodesPerMinute * (1 - NODES_PER_MINUTE_SMOOTHING_ALPHA) +
                  instantRate * NODES_PER_MINUTE_SMOOTHING_ALPHA
                );
              }
            }
          }
        }

        const nodesPerMinute = Math.max(smoothedNodesPerMinute, 0);
        await sendOrGetNodesPerMinute(nodesPerMinute);


        // Persist fresh stats in SQL storage
        if (previousTotalNodes > 0 && latestTotalNodes !== null && newHourlyTotalNodes > 0) {
          await sendOrGetNewNodesHour(newHourlyTotalNodes);
        }

        if (previousTotalNodes <= totalNodes) {
          await sendOrGetNodeTotal(totalNodes);
        }
        await sendOrGetChangesetTotal(totalChangesets);
        await sendOrGetTotalChangesetsTrend(totalChangesets);

        for (const user of Array.from(new Set(changesetBatch.map((cs: Changeset) => cs.user)))) {
          await sendOrGetUniqueMappersHour(user as string);
        }

        for (const cs of changesetBatch) {
          await sendOrGetTopMappersHour(cs.user, cs.changes_count, cs.id);
          await sendOrGetTopCountriesHour(cs.countryCode ?? null, cs.changes_count, cs.id);
          await sendOrGetAverageChangesHour(cs.user, cs.changes_count);
          await sendOrGetLargestChangesetHour(cs.user, cs.changes_count);
        }

        const topMappersHour = await sendOrGetTopMappersHour();
        const topCountriesHour = await sendOrGetTopCountriesHour();
        const averageChangesHour = await sendOrGetAverageChangesHour();
        const largestChangesetHour = await sendOrGetLargestChangesetHour();
        const uniqueMappersHour = await sendOrGetUniqueMappersHour();

        io.emit("stats", {
          changesetBatch: enrichChangesetsWithCountry(changesetBatch),
          totalNodes: await sendOrGetNodeTotal(),
          totalChangesets,
          uniqueMappersHour,
          topMappersHour,
          topCountriesHour,
          averageChangesHour,
          largestChangesetHour,
          nodesPerMinute: await sendOrGetNodesPerMinute(),
          topMappersBatch: getTopMappers(changesetBatch),
          averageChangesBatch: getAverageChanges(changesetBatch),
          largestChangesetBatch: getLargestChangeset(changesetBatch),
          newNodesHour: await sendOrGetNewNodesHour(),
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
