'use server'

import { client } from "../lib/db"

function getCurrentHourKey() {
  const now = new Date();
  // Format: top_mappers:YYYY-MM-DD-HH (UTC)
  return `top_mappers:${now.getUTCFullYear()}-${now.getUTCMonth()+1}-${now.getUTCDate()}-${now.getUTCHours()}`;
}

export async function sendOrGetTopMappersHour(user: string | null = null, changes: number = 1, changesetId: number | null = null) {
  const hourKey = getCurrentHourKey();
  if (user && changesetId !== null) {
    const userSetKey = `${hourKey}:user:${user}:changesets`;
    const alreadyCounted = await client.sIsMember(userSetKey, String(changesetId));
    if (!alreadyCounted) {
      await client.zIncrBy(hourKey, changes, user);
      await client.sAdd(userSetKey, String(changesetId));
      await client.expire(userSetKey, 60 * 60 * 25);
      await client.expire(hourKey, 60 * 60 * 25);
    }
  }

  const raw = await client.sendCommand(['ZREVRANGE', hourKey, '0', '17', 'WITHSCORES']);
  const top = Array.isArray(raw) ? raw : [];
  const result = [];
  for (let i = 0; i < top.length; i += 2) {
    result.push({ user: String(top[i]), count: parseInt(top[i+1] as string, 10) });
  }

  return result;
} 