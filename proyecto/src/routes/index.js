import { Router } from 'express';
import { getProducts, getProductById } from '../controllers/product.controller.js';
import { getProviders, getProviderById } from '../controllers/provider.controller.js';
import { compareProducts } from '../controllers/compare.controller.js';
import { search } from '../controllers/search.controller.js';
import { login, register } from '../controllers/auth.controller.js';

const router = Router();

// Auth
router.post('/auth/register', register);
router.post('/auth/login', login);

// Products
router.get('/products', getProducts);
router.get('/products/:id', getProductById);

// Providers
router.get('/providers', getProviders);
router.get('/providers/:id', getProviderById);

// Compare
router.get('/compare', compareProducts);

// Search
router.get('/search', search);

export default router;
