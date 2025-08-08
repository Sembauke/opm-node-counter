'use server'

import { client } from "../lib/db"

function getCurrentHourKey() {
  const now = new Date();
  // Format: largest_changeset:YYYY-MM-DD-HH (UTC)
  return `largest_changeset:${now.getUTCFullYear()}-${now.getUTCMonth()+1}-${now.getUTCDate()}-${now.getUTCHours()}`;
}

export async function sendOrGetLargestChangesetHour(user: string | null = null, changesCount: number | null = null) {
  const hourKey = getCurrentHourKey();
  if (user && changesCount !== null) {
    const current = parseInt(await client.get(hourKey) || '0', 10);
    if (changesCount > current) {
      await client.set(hourKey, changesCount.toString());
      await client.expire(hourKey, 60 * 60 * 25);
    }
  }
  return parseInt(await client.get(hourKey) || '0', 10);
} 