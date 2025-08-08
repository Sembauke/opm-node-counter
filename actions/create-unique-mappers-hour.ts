'use server'

import { client } from "../lib/db"

function getCurrentHourKey() {
  const now = new Date();
  // Format: unique_mappers:YYYY-MM-DD-HH (UTC)
  return `unique_mappers:${now.getUTCFullYear()}-${now.getUTCMonth()+1}-${now.getUTCDate()}-${now.getUTCHours()}`;
}

export async function sendOrGetUniqueMappersHour(user: string | null = null) {
  const hourKey = getCurrentHourKey();
  if (user) {
    await client.sAdd(hourKey, user);

    await client.expire(hourKey, 60 * 60 * 25);
  }
  const count = await client.sCard(hourKey);
  return count;
} 