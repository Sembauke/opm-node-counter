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
import { sendOrGetProjectTagsHour } from "@/actions/create-project-tags-hour";
import {
  HOURLY_ALL_TIME_HIGH_KEYS,
  sendOrGetHourlyAllTimeHigh,
} from "@/actions/create-hourly-all-time-high";
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
  const totalChanges = await sendOrGetNodeTotal();
  const totalChangesets = await sendOrGetChangesetTotal();
  const uniqueMappersHour = await sendOrGetUniqueMappersHour();
  const uniqueMappersLastHour = await sendOrGetUniqueMappersHour(null, -1);
  const topMappersHour = await sendOrGetTopMappersHour();
  const topMappersLastHour = await sendOrGetTopMappersHour(null, 1, null, -1);
  const topCountriesHour = await sendOrGetTopCountriesHour();
  const topCountriesLastHour = await sendOrGetTopCountriesHour(null, 1, null, -1);
  const averageChangesHour = await sendOrGetAverageChangesHour();
  const averageChangesLastHour = await sendOrGetAverageChangesHour(null, null, -1);
  const newNodesHour = await sendOrGetNewNodesHour();
  const newNodesLastHour = await sendOrGetNewNodesHour(null, -1);
  const changesPerMinute = await sendOrGetNodesPerMinute();
  const changesPerMinuteAllTimeHigh = await sendOrGetNodesPerMinuteAllTimeHigh();
  const changesPerMinuteTrend: ChangesetsTrendPoint[] = await sendOrGetNodesPerMinuteTrend();
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

  return <HomeClient
    changesetBatch={changesetBatch}
    totalChanges={totalChanges}
    totalChangesets={totalChangesets}
    totalSovereignCountries={TOTAL_SOVEREIGN_COUNTRIES}
    uniqueMappersHour={uniqueMappersHour}
    uniqueMappersLastHour={uniqueMappersLastHour}
    topMappersHour={topMappersHour}
    topMappersLastHour={topMappersLastHour}
    topMappersLeaderAllTimeHigh={topMappersLeaderAllTimeHigh}
    topCountriesHour={topCountriesHour}
    topCountriesLastHour={topCountriesLastHour}
    topCountriesLeaderAllTimeHigh={topCountriesLeaderAllTimeHigh}
    averageChangesHour={averageChangesHour}
    averageChangesLastHour={averageChangesLastHour}
    averageChangesAllTimeHigh={averageChangesAllTimeHigh}
    changesPerMinute={changesPerMinute}
    changesPerMinuteAllTimeHigh={changesPerMinuteAllTimeHigh}
    newNodesHour={newNodesHour}
    newNodesLastHour={newNodesLastHour}
    newNodesAllTimeHigh={newNodesAllTimeHigh}
    changesPerMinuteTrend={changesPerMinuteTrend}
    uniqueMappersAllTimeHigh={uniqueMappersAllTimeHigh}
    activeCountriesAllTimeHigh={activeCountriesAllTimeHigh}
    projectTagsHour={projectTagsHour}
    projectTagsLastHour={projectTagsLastHour}
    projectTagsAllTimeHigh={projectTagsAllTimeHigh}
  />;
}
