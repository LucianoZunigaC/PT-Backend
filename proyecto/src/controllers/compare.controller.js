import * as compareService from '../services/compare.service.js';
import { getCache, setCache } from '../utils/redis.js';

export const compareProducts = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Se requiere un término (q) para comparar' });
    }

    const cacheKey = `compare_${q.toLowerCase().trim()}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const compared = await compareService.comparePrices(q);
    await setCache(cacheKey, compared, 600); // 10 minutes cache
    res.json(compared);
  } catch (error) {
    next(error);
  }
};
