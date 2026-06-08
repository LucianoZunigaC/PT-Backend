import { Router } from 'express';
import * as productosController from '../controllers/productos.controller.js';
import * as categoriasController from '../controllers/categorias.controller.js';
import * as proveedoresController from '../controllers/proveedores.controller.js';
import * as redireccionesController from '../controllers/redirecciones.controller.js';

const router = Router();

// ── PRODUCTOS ────────────────────────────────────────────────────────────────
// Rutas específicas PRIMERO (antes de /:id)
router.get('/productos/busqueda',    productosController.buscarProductos);
router.get('/productos/comparacion', productosController.compararProductos);
router.get('/productos/sugerencias', productosController.sugerenciasProductos);
router.get('/productos/destacados',  productosController.productosDestacados);
router.get('/productos/indice',      productosController.indicePrecios);

// Rutas con parámetros
router.get('/productos/:id/historial', productosController.historialPrecios);
router.get('/productos/:id',           productosController.obtenerProductoPorId);

// ── CATEGORÍAS ────────────────────────────────────────────────────────────────
router.get('/categorias',          categoriasController.obtenerCategorias);
router.get('/categorias/:id/stats', categoriasController.statsCategorias);

// ── PROVEEDORES ───────────────────────────────────────────────────────────────
router.get('/proveedores', proveedoresController.obtenerProveedores);

// ── REDIRECCIONES ─────────────────────────────────────────────────────────────
router.post('/redirecciones',      redireccionesController.registrarRedireccion);
router.get('/redirecciones/url',   redireccionesController.obtenerUrlRedireccion);

export default router;
