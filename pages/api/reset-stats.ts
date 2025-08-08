import { NextApiRequest, NextApiResponse } from 'next';
import { client } from '../../lib/db';

const patterns = [
  'nodes',
  'changesets',
  'top_mappers:*',
  'unique_mappers:*',
  'avg_changes:*',
  'largest_changeset:*',
  'top_mappers:*:user:*:changesets',
  'avg_changes:*:total',
  'avg_changes:*:count',
  'new_nodes:*'
];

async function deleteMatchingKeys(pattern: string) {
  const keysToDelete: string[] = [];
  for await (const key of client.scanIterator({ MATCH: pattern })) {
    keysToDelete.push(key);
    if (keysToDelete.length >= 100) {
      await client.del(keysToDelete);
      keysToDelete.length = 0;
    }
  }
  if (keysToDelete.length > 0) {
    await client.del(keysToDelete);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  for (const pattern of patterns) {
    await deleteMatchingKeys(pattern);
  }
  res.json({ success: true });
} 