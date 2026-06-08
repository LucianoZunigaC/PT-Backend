import { prisma } from '../lib/prisma.js';


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/proveedores
// Lista todos los proveedores
// ─────────────────────────────────────────────────────────────────────────────
export const obtenerProveedores = async (req, res, next) => {
  try {
    const proveedores = await prisma.proveedor.findMany({
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, sitio_web: true },
    });
    res.json(proveedores);
  } catch (error) {
    next(error);
  }
};
