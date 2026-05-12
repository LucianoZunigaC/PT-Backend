import * as searchService from '../services/search.service.js';
import { getCache, setCache } from '../utils/redis.js';

export const search = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Se requiere un término de búsqueda (q)' });
    }

    const cacheKey = `search_${q.toLowerCase().trim()}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const results = await searchService.searchCatalog(q);
    await setCache(cacheKey, results, 600); // 10 minutes cache
    res.json(results);
  } catch (error) {
    next(error);
  }
};
