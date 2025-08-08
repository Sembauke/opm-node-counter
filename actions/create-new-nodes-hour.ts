'use server'

import { client } from "../lib/db"

function getCurrentHourKey() {
  const now = new Date();
  // Format: new_nodes:YYYY-MM-DD-HH (UTC)
  return `new_nodes:${now.getUTCFullYear()}-${now.getUTCMonth()+1}-${now.getUTCDate()}-${now.getUTCHours()}`;
}

export async function sendOrGetNewNodesHour(count: number | null = null) {
  const hourKey = getCurrentHourKey();
  if (count !== null && count > 0) {
    await client.incrBy(hourKey, count);
    await client.expire(hourKey, 60 * 60 * 25);
  }
  const total = parseInt(await client.get(hourKey) || '0', 10);
  return total;
} 