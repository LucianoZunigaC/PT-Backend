import * as providerService from '../services/provider.service.js';
import { getCache, setCache } from '../utils/redis.js';

export const getProviders = async (req, res, next) => {
  try {
    const cacheKey = 'providers_all';
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const providers = await providerService.getAllProviders();
    await setCache(cacheKey, providers, 3600); // 1 hour cache
    res.json(providers);
  } catch (error) {
    next(error);
  }
};

export const getProviderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `provider_${id}`;
    
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const provider = await providerService.getProviderById(id);
    if (!provider) return res.status(404).json({ error: 'Proveedor no encontrado' });

    await setCache(cacheKey, provider, 3600);
    res.json(provider);
  } catch (error) {
    next(error);
  }
};
