import * as productService from '../services/product.service.js';
import { getCache, setCache } from '../utils/redis.js';

export const getProducts = async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const cacheKey = `products_${limit}_${offset}`;
    
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const products = await productService.getAllProducts({ limit, offset });
    await setCache(cacheKey, products, 600); // 10 minutes cache
    res.json(products);
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `product_${id}`;

    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const product = await productService.getProductById(id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    await setCache(cacheKey, product, 600);
    res.json(product);
  } catch (error) {
    next(error);
  }
};
