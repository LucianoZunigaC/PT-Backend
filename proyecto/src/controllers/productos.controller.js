import { prisma } from '../lib/prisma.js';
import { ejecutarScrapingDinamico } from '../services/scraping.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/productos/busqueda?q=&cat=&precio_min=&precio_max=&sort=&page=&limit=
// ─────────────────────────────────────────────────────────────────────────────
export const buscarProductos = async (req, res, next) => {
  try {
    const { q, cat, precio_min, precio_max, sort, page = 1, limit = 12, marcas, proveedores } = req.query;

    if (!q && !cat) {
      return res.status(400).json({ error: 'Se requiere un término de búsqueda (q) o categoría (cat)' });
    }

    const where = {};

    if (q) {
      where.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { marca:  { contains: q, mode: 'insensitive' } },
      ];
    }

    if (cat) {
      where.categoria = {
        nombre: { contains: cat.replace(/-/g, ' '), mode: 'insensitive' }
      };
    }

    // Cargamos todos los precios disponibles para poder mostrar comparación múltiple de inmediato
    let productos = await prisma.producto.findMany({
      where,
      include: {
        categoria: { select: { id: true, nombre: true } },
        precios: {
          include: { proveedor: { select: { id: true, nombre: true, sitio_web: true } } },
          orderBy: { precio: 'asc' }, // Ordenados por menor precio
        },
      },
    });

    // Si no hay productos, intentamos un scraping dinámico en vivo
    if (productos.length === 0 && q) {
      console.log(`[Busqueda] No se encontraron resultados para '${q}', iniciando scraping dinámico...`);
      const guardados = await ejecutarScrapingDinamico(q);
      
      if (guardados > 0) {
        // Volver a buscar después de guardar
        productos = await prisma.producto.findMany({
          where,
          include: {
            categoria: { select: { id: true, nombre: true } },
            precios: {
              include: { proveedor: { select: { id: true, nombre: true, sitio_web: true } } },
              orderBy: { precio: 'asc' },
            },
          },
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Generar Facetas (Estadísticas dinámicas del pool total de productos)
    // ─────────────────────────────────────────────────────────────────────────
    const facetas = {
      marcas: {},
      proveedores: {}
    };

    productos.forEach(p => {
      // Marcas
      if (p.marca) {
        const brand = p.marca.trim();
        facetas.marcas[brand] = (facetas.marcas[brand] || 0) + 1;
      }
      
      // Proveedores únicos que ofrecen este producto
      p.precios?.forEach(pr => {
        const prov = pr.proveedor?.nombre;
        if (prov) {
          facetas.proveedores[prov] = (facetas.proveedores[prov] || 0) + 1;
        }
      });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Aplicar Filtros Avanzados en Memoria
    // ─────────────────────────────────────────────────────────────────────────
    let filtrados = productos;

    // Filtro por Marca
    if (marcas) {
      const selectedBrands = marcas.split(',').map(m => m.trim().toLowerCase());
      filtrados = filtrados.filter(p => {
        const b = (p.marca || '').trim().toLowerCase();
        return selectedBrands.includes(b);
      });
    }

    // Filtro por Proveedores
    if (proveedores) {
      const selectedProvs = proveedores.split(',').map(p => p.trim().toLowerCase());
      filtrados = filtrados.filter(p => {
        return p.precios.some(pr => {
          const prov = (pr.proveedor?.nombre || '').trim().toLowerCase();
          return selectedProvs.includes(prov);
        });
      });
    }

    // Filtrar por rango de precios
    if (precio_min || precio_max) {
      filtrados = filtrados.filter(p => {
        const precio = Number(p.precios[0]?.precio ?? 0); // El menor precio (ya que están ordered asc)
        const minOk = precio_min ? precio >= Number(precio_min) : true;
        const maxOk = precio_max ? precio <= Number(precio_max) : true;
        return precio > 0 && minOk && maxOk;
      });
    }

    // Ordenamiento
    if (sort === 'price-asc') {
      filtrados.sort((a, b) => Number(a.precios[0]?.precio ?? 999999999) - Number(b.precios[0]?.precio ?? 999999999));
    } else if (sort === 'price-desc') {
      filtrados.sort((a, b) => Number(b.precios[0]?.precio ?? 0) - Number(a.precios[0]?.precio ?? 0));
    } else if (sort === 'providers') {
      // Más proveedores primero
      filtrados.sort((a, b) => (b.precios?.length || 0) - (a.precios?.length || 0));
    }

    // Paginación
    const pageNum   = Math.max(1, parseInt(page));
    const limitNum  = Math.min(50, Math.max(1, parseInt(limit)));
    const total     = filtrados.length;
    const totalPages = Math.ceil(total / limitNum);
    const inicio    = (pageNum - 1) * limitNum;
    const paginados = filtrados.slice(inicio, inicio + limitNum);

    res.json({ 
      total, 
      page: pageNum, 
      limit: limitNum, 
      totalPages, 
      facetas,
      productos: paginados 
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/productos/comparacion?q=
// ─────────────────────────────────────────────────────────────────────────────
export const compararProductos = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Se requiere un término (q) para comparar' });

    const productos = await prisma.producto.findMany({
      where: { nombre: { contains: q, mode: 'insensitive' } },
      include: {
        categoria: { select: { id: true, nombre: true } },
        precios: { orderBy: { fecha_actualizacion: 'desc' }, take: 1 },
      },
    });

    const ordenados = productos.sort((a, b) =>
      Number(a.precios[0]?.precio ?? 9999999) - Number(b.precios[0]?.precio ?? 9999999)
    );

    res.json(ordenados);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/productos/sugerencias?q=&limit=5
// ─────────────────────────────────────────────────────────────────────────────
export const sugerenciasProductos = async (req, res, next) => {
  try {
    const { q, limit = 5 } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const productos = await prisma.producto.findMany({
      where: { nombre: { contains: q, mode: 'insensitive' } },
      select: { nombre: true },
      distinct: ['nombre'],
      take: parseInt(limit),
      orderBy: { nombre: 'asc' },
    });

    res.json(productos.map(p => p.nombre));
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/productos/destacados?limit=4
// ─────────────────────────────────────────────────────────────────────────────
export const productosDestacados = async (req, res, next) => {
  try {
    const { limit = 4 } = req.query;

    const productos = await prisma.producto.findMany({
      include: {
        categoria: { select: { id: true, nombre: true } },
        precios: { orderBy: { fecha_actualizacion: 'desc' }, take: 5, include: { proveedor: true } },
      },
      where: { precios: { some: {} } },
      take: parseInt(limit) * 5,
    });

    const conAhorro = productos
      .map(p => {
        const precios = p.precios.map(pr => Number(pr.precio)).filter(pr => pr > 0);
        if (precios.length < 1) return null;
        const minPrecio = Math.min(...precios);
        const maxPrecio = Math.max(...precios);
        return { ...p, precio_minimo: minPrecio, precio_maximo: maxPrecio, ahorro_potencial: maxPrecio - minPrecio };
      })
      .filter(Boolean)
      .sort((a, b) => b.ahorro_potencial - a.ahorro_potencial)
      .slice(0, parseInt(limit));

    res.json(conAhorro);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/productos/indice?limit=10
// ─────────────────────────────────────────────────────────────────────────────
export const indicePrecios = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const productos = await prisma.producto.findMany({
      include: {
        categoria: { select: { id: true, nombre: true } },
        precios: {
          orderBy: { fecha_actualizacion: 'desc' },
          take: 10,
          include: { proveedor: { select: { id: true, nombre: true } } },
        },
      },
      where: { precios: { some: {} } },
      take: parseInt(limit) * 3,
    });

    const indice = productos
      .map(p => {
        const precios = p.precios.map(pr => Number(pr.precio)).filter(pr => pr > 0);
        if (precios.length === 0) return null;
        const proveedores = [...new Set(p.precios.map(pr => pr.proveedor?.nombre).filter(Boolean))];
        return {
          id: p.id,
          nombre: p.nombre,
          categoria: p.categoria,
          precio_minimo: Math.min(...precios),
          precio_maximo: Math.max(...precios),
          cantidad_tiendas: proveedores.length,
          proveedores,
          ultima_actualizacion: p.precios[0]?.fecha_actualizacion,
        };
      })
      .filter(Boolean)
      .slice(0, parseInt(limit));

    res.json(indice);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/productos/:id
// ─────────────────────────────────────────────────────────────────────────────
export const obtenerProductoPorId = async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);

    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: { select: { id: true, nombre: true } },
        precios: {
          include: { proveedor: { select: { id: true, nombre: true, sitio_web: true } } },
          orderBy: { fecha_actualizacion: 'desc' },
        },
      },
    });

    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    // Solo el precio más reciente por proveedor
    const preciosPorProveedor = new Map();
    for (const precio of producto.precios) {
      const key = precio.proveedor_id?.toString();
      if (key && !preciosPorProveedor.has(key)) preciosPorProveedor.set(key, precio);
    }

    const precios_actuales = Array.from(preciosPorProveedor.values())
      .sort((a, b) => Number(a.precio) - Number(b.precio));

    res.json({
      ...producto,
      precios: precios_actuales,
      precio_minimo: precios_actuales[0]?.precio ?? null,
      precio_maximo: precios_actuales[precios_actuales.length - 1]?.precio ?? null,
      cantidad_tiendas: precios_actuales.length,
    });
  } catch (error) {
    // Si el id no es un BigInt válido
    if (error.message?.includes('Cannot convert')) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/productos/:id/historial?dias=30
// ─────────────────────────────────────────────────────────────────────────────
export const historialPrecios = async (req, res, next) => {
  try {
    const id = BigInt(req.params.id);
    const { dias = 30 } = req.query;

    const fechaDesde = new Date();
    fechaDesde.setDate(fechaDesde.getDate() - parseInt(dias));

    const precios = await prisma.precio.findMany({
      where: {
        producto_id: id,
        fecha_actualizacion: { gte: fechaDesde },
      },
      include: { proveedor: { select: { id: true, nombre: true } } },
      orderBy: { fecha_actualizacion: 'asc' },
    });

    // Agrupar por día
    const porDia = new Map();
    for (const p of precios) {
      const dia = p.fecha_actualizacion.toISOString().split('T')[0];
      if (!porDia.has(dia)) porDia.set(dia, { fecha: dia, precios: [] });
      porDia.get(dia).precios.push(Number(p.precio));
    }

    const historial = Array.from(porDia.values()).map(d => ({
      fecha: d.fecha,
      precio_minimo:  Math.min(...d.precios),
      precio_maximo:  Math.max(...d.precios),
      precio_promedio: Math.round(d.precios.reduce((a, b) => a + b, 0) / d.precios.length),
    }));

    const todosLosPrecios = precios.map(p => Number(p.precio));
    const stats = todosLosPrecios.length > 0 ? {
      minimo:   Math.min(...todosLosPrecios),
      maximo:   Math.max(...todosLosPrecios),
      promedio: Math.round(todosLosPrecios.reduce((a, b) => a + b, 0) / todosLosPrecios.length),
    } : null;

    res.json({ historial, stats, dias: parseInt(dias) });
  } catch (error) {
    if (error.message?.includes('Cannot convert')) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }
    next(error);
  }
};
