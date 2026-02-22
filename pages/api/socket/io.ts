import { Server } from "socket.io";
import { sendOrGetNodeTotal } from "@/actions/create-node-total";
import { sendOrGetChangesetTotal } from "@/actions/create-changeset-total";
import { sendOrGetUniqueMappersHour } from "@/actions/create-unique-mappers-hour";
import { sendOrGetTopMappersHour } from "@/actions/create-top-mappers-hour";
import { sendOrGetAverageChangesHour } from "@/actions/create-average-changes-hour";
import { sendOrGetLargestChangesetHour } from "@/actions/create-largest-changeset-hour";
import { sendOrGetNewNodesHour } from "@/actions/create-new-nodes-hour";
import { convertXML } from "simple-xml-to-json";
import type { Changeset } from "@/types/changeset";

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
  const response = await fetch(
    "https://www.openstreetmap.org/api/0.6/changesets.json?limit=25&closed=true",
    { cache: "no-store" }
  );
  const response_data = await response.json();
  return response_data["changesets"];
}

async function getlatestTotalNodesInfo(arg: Changeset | any[] | null): Promise<{ latestTotalNodes: any }> {
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
  return { latestTotalNodes: lastNode?.id };
}

let intervalStarted = false;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: "/api/socket/io",
      addTrailingSlash: false,
      cors: { origin: "*" }
    });
    res.socket.server.io = io;
    console.log("Socket.io server started at /api/socket/io");

    if (!intervalStarted) {
      intervalStarted = true;
      setInterval(async () => {
        const changesetBatch: Changeset[] = await getLatestChangesets();
        const totalChangesets = changesetBatch.length > 0 ? changesetBatch[0].id : 0;
        const topMappersHour = await sendOrGetTopMappersHour();
        const averageChangesHour = await sendOrGetAverageChangesHour();
        const largestChangesetHour = await sendOrGetLargestChangesetHour();

        const previousTotalNodes = await sendOrGetNodeTotal();

        const latestChangeset: Changeset = changesetBatch[0];
        const { latestTotalNodes } = await getlatestTotalNodesInfo(latestChangeset);

        const totalNodes = latestTotalNodes > 0 ? latestTotalNodes : previousTotalNodes;
        const newHourlyTotalNodes = totalNodes - previousTotalNodes;

        let nodesPerMinute = 0;

        if (changesetBatch.length > 1) {
          const totalNodesChanged = changesetBatch.reduce((sum: number, cs: Changeset) => sum + cs.changes_count, 0);

          const timestamps = changesetBatch.map((cs: Changeset) => {
            const dateStr = cs.created_at ?? cs.timestamp;
            return dateStr ? new Date(dateStr).getTime() : 0;
          });
          const minTime = Math.min(...timestamps);
          const maxTime = Math.max(...timestamps);
          const minutes = Math.max((maxTime - minTime) / 1000 / 60, 1);
          nodesPerMinute = Math.round(totalNodesChanged / minutes);
        }


        // Persist fresh stats in SQL storage

        if(previousTotalNodes != 0 && latestTotalNodes != 0){
          await sendOrGetNewNodesHour(newHourlyTotalNodes);
        }


        if(previousTotalNodes <= totalNodes){
          await sendOrGetNodeTotal(totalNodes);
        }

        if(previousTotalNodes != 0 && latestTotalNodes != 0){
          await sendOrGetNewNodesHour(newHourlyTotalNodes);
        }

        await sendOrGetChangesetTotal(totalChangesets);

        for (const user of Array.from(new Set(changesetBatch.map((cs: Changeset) => cs.user)))) {
          await sendOrGetUniqueMappersHour(user as string);
        }

        for (const cs of changesetBatch) {
          await sendOrGetTopMappersHour(cs.user, cs.changes_count, cs.id);
          await sendOrGetAverageChangesHour(cs.user, cs.changes_count);
          await sendOrGetLargestChangesetHour(cs.user, cs.changes_count);
        }

        io.emit("stats", {
          changesetBatch,
          totalNodes: await sendOrGetNodeTotal(),
          totalChangesets,
          uniqueMappersHour: await sendOrGetUniqueMappersHour(),
          topMappersHour,
          averageChangesHour,
          largestChangesetHour,
          nodesPerMinute,
          topMappersBatch: getTopMappers(changesetBatch),
          averageChangesBatch: getAverageChanges(changesetBatch),
          largestChangesetBatch: getLargestChangeset(changesetBatch),
          newNodesHour: await sendOrGetNewNodesHour(),
        });

      }, 6000);
    }
  }

  res.end();
} 
