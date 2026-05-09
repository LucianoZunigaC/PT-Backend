import { Router } from 'express';
import * as productosController from '../controllers/productos.controller.js';
import * as categoriasController from '../controllers/categorias.controller.js';

const router = Router();

// Rutas de búsqueda y comparación
router.get('/productos/busqueda', productosController.buscarProductos);
router.get('/productos/comparacion', productosController.compararProductos);

// Rutas de filtros y categorías
router.get('/categorias', categoriasController.obtenerCategorias);

export default router;
