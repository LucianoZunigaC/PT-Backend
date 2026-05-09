import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const buscarProductos = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Se requiere un término de búsqueda (q)' });
    }

    const productos = await prisma.producto.findMany({
      where: {
        OR: [
          { nombre: { contains: q, mode: 'insensitive' } },
          { marca: { contains: q, mode: 'insensitive' } }
        ]
      },
      include: {
        proveedor: true,
        precios: {
          orderBy: { fecha_actualizacion: 'desc' },
          take: 1
        }
      }
    });

    res.json(productos);
  } catch (error) {
    next(error);
  }
};

export const compararProductos = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Se requiere un término (q) para comparar' });
    }

    const productos = await prisma.producto.findMany({
      where: {
        nombre: { contains: q, mode: 'insensitive' }
      },
      include: {
        proveedor: true,
        precios: {
          orderBy: { fecha_actualizacion: 'desc' },
          take: 1
        }
      }
    });

    // Ordenar por precio más bajo
    const ordenados = productos.sort((a, b) => {
      const precioA = Number(a.precios[0]?.precio || 9999999);
      const precioB = Number(b.precios[0]?.precio || 9999999);
      return precioA - precioB;
    });

    res.json(ordenados);
  } catch (error) {
    next(error);
  }
};
