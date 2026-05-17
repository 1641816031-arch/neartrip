import { Router } from 'express';
import { queryTrains } from '../services/railway.js';
import { ticketCache } from '../utils/cache.js';

const router = Router();

router.get('/', async (req, res) => {
  const { from, to, date, nocache } = req.query;

  if (!from || !to || !date) {
    return res.status(400).json({ error: 'Missing required parameters: from, to, date' });
  }

  const cacheKey = `${from}-${to}-${date}`;

  // 检查缓存（除非 nocache=1）
  if (nocache !== '1') {
    const cached = ticketCache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return res.json(cached);
    }
  }

  try {
    console.log(`[API] Querying trains: ${from} -> ${to}, ${date}`);
    const trains = await queryTrains({ 
      from: from as string, 
      to: to as string, 
      date: date as string 
    });

    const result = {
      from,
      to,
      date,
      trainCount: trains.length,
      trains
    };

    // 存入缓存，TTL 5 分钟
    ticketCache.set(cacheKey, result, 5 * 60 * 1000);

    res.json(result);
  } catch (error) {
    console.error('[API] Query failed:', error);
    res.status(500).json({ 
      error: 'Failed to query trains',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;