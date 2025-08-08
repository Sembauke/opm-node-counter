'use server'

import { client } from "../lib/db"

function getCurrentHourKey() {
  const now = new Date();
  // Format: avg_changes:YYYY-MM-DD-HH (UTC)
  return `avg_changes:${now.getUTCFullYear()}-${now.getUTCMonth()+1}-${now.getUTCDate()}-${now.getUTCHours()}`;
}

export async function sendOrGetAverageChangesHour(user: string | null = null, changesCount: number | null = null) {
  const hourKey = getCurrentHourKey();
  const totalKey = hourKey + ':total';
  const countKey = hourKey + ':count';
  if (user && changesCount !== null) {
    await client.incrBy(totalKey, changesCount);
    await client.incr(countKey);
    await client.expire(totalKey, 60 * 60 * 25);
    await client.expire(countKey, 60 * 60 * 25);
  }
  const total = parseInt(await client.get(totalKey) || '0', 10);
  const count = parseInt(await client.get(countKey) || '0', 10);
  if (count === 0) return 0;
  return Math.round(total / count);
} 