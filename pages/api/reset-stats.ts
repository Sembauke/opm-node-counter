import { NextApiRequest, NextApiResponse } from 'next';
import { resetAllStats } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  resetAllStats();
  res.json({ success: true });
}
