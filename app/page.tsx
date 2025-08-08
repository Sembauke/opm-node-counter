import { sendOrGetNodeTotal } from "@/actions/create-node-total";
import { sendOrGetChangesetTotal } from "@/actions/create-changeset-total";
import { sendOrGetUniqueMappersHour } from "@/actions/create-unique-mappers-hour";
import { sendOrGetTopMappersHour } from "@/actions/create-top-mappers-hour";
import { sendOrGetAverageChangesHour } from "@/actions/create-average-changes-hour";
import { sendOrGetLargestChangesetHour } from "@/actions/create-largest-changeset-hour";
import HomeClient from "./HomeClient";

interface Changeset {
  min_lat: number;
  min_lon: number;
  max_lat: number;
  max_lon: number;
  changes_count: number;
  id: number;
  tags: {
    comment: string;
  };
  user: string;
}

function getNodesPerMinute(changesets: Changeset[]): number {
  if (changesets.length < 2) return 0;
  const totalChanges = changesets.reduce((sum, cs) => sum + cs.changes_count, 0);
  return Math.round(totalChanges / 5);
}

async function getLatestChangesets(): Promise<Changeset[]> {
  const response = await fetch(
    "https://www.openstreetmap.org/api/0.6/changesets.json?limit=25",
    { cache: "no-store" }
  );
  const response_data = await response.json();
  return response_data["changesets"];
}

export default async function Home() {

  const changesetBatch = await getLatestChangesets();
  const totalNodes = await sendOrGetNodeTotal();
  const totalChangesets = await sendOrGetChangesetTotal();
  const uniqueMappersHour = await sendOrGetUniqueMappersHour();
  const topMappersHour = await sendOrGetTopMappersHour();
  const averageChangesHour = await sendOrGetAverageChangesHour();
  const largestChangesetHour = await sendOrGetLargestChangesetHour();
  const nodesPerMinute = getNodesPerMinute(changesetBatch);

  return <HomeClient
    changesetBatch={changesetBatch}
    totalNodes={totalNodes}
    totalChangesets={totalChangesets}
    uniqueMappersHour={uniqueMappersHour}
    topMappersHour={topMappersHour}
    averageChangesHour={averageChangesHour}
    largestChangesetHour={largestChangesetHour}
    nodesPerMinute={nodesPerMinute}
  />;
}
