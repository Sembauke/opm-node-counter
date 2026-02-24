import { sendOrGetNodeTotal } from "@/actions/create-node-total";
import { sendOrGetChangesetTotal } from "@/actions/create-changeset-total";
import { sendOrGetUniqueMappersHour } from "@/actions/create-unique-mappers-hour";
import { sendOrGetTopMappersHour } from "@/actions/create-top-mappers-hour";
import { sendOrGetTopCountriesHour } from "@/actions/create-top-countries-hour";
import { sendOrGetAverageChangesHour } from "@/actions/create-average-changes-hour";
import { sendOrGetLargestChangesetHour } from "@/actions/create-largest-changeset-hour";
import { sendOrGetNewNodesHour } from "@/actions/create-new-nodes-hour";
import {
  sendOrGetNodesPerMinute,
  sendOrGetNodesPerMinuteAllTimeHigh,
} from "@/actions/create-nodes-per-minute";
import { sendOrGetNodesPerMinuteTrend } from "@/actions/create-nodes-per-minute-trend";
import { enrichChangesetsWithCountry } from "@/lib/changeset-country";
import { TOTAL_SOVEREIGN_COUNTRIES } from "@/lib/sovereign-countries";
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
  const uniqueMappersLastHour = await sendOrGetUniqueMappersHour(null, -1);
  const topMappersHour = await sendOrGetTopMappersHour();
  const topMappersLastHour = await sendOrGetTopMappersHour(null, 1, null, -1);
  const topCountriesHour = await sendOrGetTopCountriesHour();
  const topCountriesLastHour = await sendOrGetTopCountriesHour(null, 1, null, -1);
  const averageChangesHour = await sendOrGetAverageChangesHour();
  const averageChangesLastHour = await sendOrGetAverageChangesHour(null, null, -1);
  const largestChangesetHour = await sendOrGetLargestChangesetHour();
  const largestChangesetLastHour = await sendOrGetLargestChangesetHour(null, null, -1);
  const newNodesHour = await sendOrGetNewNodesHour();
  const newNodesLastHour = await sendOrGetNewNodesHour(null, -1);
  const nodesPerMinute = await sendOrGetNodesPerMinute();
  const nodesPerMinuteAllTimeHigh = await sendOrGetNodesPerMinuteAllTimeHigh();
  const nodesPerMinuteTrend: ChangesetsTrendPoint[] = await sendOrGetNodesPerMinuteTrend();

  return <HomeClient
    changesetBatch={changesetBatch}
    totalNodes={totalNodes}
    totalChangesets={totalChangesets}
    totalSovereignCountries={TOTAL_SOVEREIGN_COUNTRIES}
    uniqueMappersHour={uniqueMappersHour}
    uniqueMappersLastHour={uniqueMappersLastHour}
    topMappersHour={topMappersHour}
    topMappersLastHour={topMappersLastHour}
    topCountriesHour={topCountriesHour}
    topCountriesLastHour={topCountriesLastHour}
    averageChangesHour={averageChangesHour}
    averageChangesLastHour={averageChangesLastHour}
    largestChangesetHour={largestChangesetHour}
    largestChangesetLastHour={largestChangesetLastHour}
    nodesPerMinute={nodesPerMinute}
    nodesPerMinuteAllTimeHigh={nodesPerMinuteAllTimeHigh}
    newNodesHour={newNodesHour}
    newNodesLastHour={newNodesLastHour}
    nodesPerMinuteTrend={nodesPerMinuteTrend}
  />;
}
