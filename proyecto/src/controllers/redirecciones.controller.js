import { prisma } from '../lib/prisma.js';


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/redirecciones
// Registra cuando un usuario hace click para ir a una tienda (tracking)
// Body: { producto_id, proveedor_id }
// ─────────────────────────────────────────────────────────────────────────────
export const registrarRedireccion = async (req, res, next) => {
  try {
    const { producto_id, proveedor_id } = req.body;

    if (!producto_id || !proveedor_id) {
      return res.status(400).json({ error: 'Se requieren producto_id y proveedor_id' });
    }

    const redireccion = await prisma.redireccion.create({
      data: {
        producto_id: BigInt(producto_id),
        proveedor_id: BigInt(proveedor_id),
        // usuario_id: null (sin autenticación por ahora)
      },
      include: {
        producto:  { select: { id: true, nombre: true } },
        proveedor: { select: { id: true, nombre: true, sitio_web: true } },
      },
    });

    res.status(201).json({
      message: 'Redirección registrada',
      redireccion,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/redirecciones/url?producto_id=&proveedor_id=
// Devuelve la URL directa del producto en el proveedor dado
// ─────────────────────────────────────────────────────────────────────────────
export const obtenerUrlRedireccion = async (req, res, next) => {
  try {
    const { producto_id, proveedor_id } = req.query;

    if (!producto_id) {
      return res.status(400).json({ error: 'Se requiere producto_id' });
    }

    const producto = await prisma.producto.findUnique({
      where: { id: BigInt(producto_id) },
      select: { nombre: true }
    });

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    let urlDestino = '#';

    // Buscar el link en la tabla Precio
    if (proveedor_id) {
      const precio = await prisma.precio.findFirst({
        where: { 
            producto_id: BigInt(producto_id),
            proveedor_id: BigInt(proveedor_id)
        },
        include: { proveedor: true }
      });
      if (precio?.link) {
          urlDestino = precio.link;
      } else if (precio?.proveedor?.sitio_web) {
          urlDestino = precio.proveedor.sitio_web;
      }
    } else {
        // Si no se da proveedor, simplemente tomar el primer precio disponible
        const precio = await prisma.precio.findFirst({
            where: { producto_id: BigInt(producto_id) }
        });
        if (precio?.link) urlDestino = precio.link;
    }

    res.json({ url_destino: urlDestino, producto_nombre: producto.nombre });
  } catch (error) {
    next(error);
  }
};
