import { prisma } from '../lib/prisma.js';


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/categorias
// Lista todas las categorías
// ─────────────────────────────────────────────────────────────────────────────
export const obtenerCategorias = async (req, res, next) => {
  try {
    const categorias = await prisma.categoria.findMany({
      orderBy: { nombre: 'asc' },
    });
    res.json(categorias);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/categorias/:id/stats
// Stats de una categoría: total productos, precio mínimo, proveedores
// ─────────────────────────────────────────────────────────────────────────────
export const statsCategorias = async (req, res, next) => {
  try {
    const { id } = req.params;

    const categoria = await prisma.categoria.findUnique({
      where: { id: BigInt(id) },
      include: {
        productos: {
          include: {
            precios: {
              orderBy: { fecha_actualizacion: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    const precios = categoria.productos
      .flatMap(p => p.precios)
      .map(pr => Number(pr.precio))
      .filter(pr => pr > 0);

    const proveedoresIds = new Set(
      categoria.productos.flatMap(p => p.precios.map(pr => pr.proveedor_id?.toString())).filter(Boolean)
    );

    res.json({
      id: categoria.id,
      nombre: categoria.nombre,
      total_productos: categoria.productos.length,
      precio_minimo: precios.length > 0 ? Math.min(...precios) : null,
      precio_maximo: precios.length > 0 ? Math.max(...precios) : null,
      cantidad_proveedores: proveedoresIds.size,
    });
  } catch (error) {
    next(error);
  }
};
