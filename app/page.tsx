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
import type { Changeset } from "@/types/changeset";
import type { ChangesetsTrendPoint } from "@/components/TotalChangesetsLineGraph";
import HomeClient from "./HomeClient";

async function getLatestChangesets(): Promise<Changeset[]> {
  const response = await fetch(
    "https://www.openstreetmap.org/api/0.6/changesets.json?limit=25&closed=true",
    { cache: "no-store" }
  );
  const response_data = await response.json();
  return enrichChangesetsWithCountry(response_data["changesets"] as Changeset[]);
}

export default async function Home() {

  const changesetBatch = await getLatestChangesets();
  const totalNodes = await sendOrGetNodeTotal();
  const totalChangesets = await sendOrGetChangesetTotal();
  const uniqueMappersHour = await sendOrGetUniqueMappersHour();
  const topMappersHour = await sendOrGetTopMappersHour();
  const topCountriesHour = await sendOrGetTopCountriesHour();
  const averageChangesHour = await sendOrGetAverageChangesHour();
  const largestChangesetHour = await sendOrGetLargestChangesetHour();
  const newNodesHour = await sendOrGetNewNodesHour();
  const nodesPerMinute = await sendOrGetNodesPerMinute();
  const changesetsTrend: ChangesetsTrendPoint[] = await sendOrGetTotalChangesetsTrend(totalChangesets);

  return <HomeClient
    changesetBatch={changesetBatch}
    totalNodes={totalNodes}
    totalChangesets={totalChangesets}
    uniqueMappersHour={uniqueMappersHour}
    topMappersHour={topMappersHour}
    topCountriesHour={topCountriesHour}
    averageChangesHour={averageChangesHour}
    largestChangesetHour={largestChangesetHour}
    nodesPerMinute={nodesPerMinute}
    newNodesHour={newNodesHour}
    changesetsTrend={changesetsTrend}
  />;
}
