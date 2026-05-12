import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const comparePrices = async (queryTerm) => {
  const productos = await prisma.producto.findMany({
    where: {
      nombre: { contains: queryTerm, mode: 'insensitive' }
    },
    include: {
      proveedor: true,
      precios: {
        orderBy: { fecha_actualizacion: 'desc' },
        take: 1
      }
    }
  });

  // Normalización básica y ranking (más barato primero)
  const ranked = productos.sort((a, b) => {
    const priceA = a.precios.length > 0 ? Number(a.precios[0].precio) : Infinity;
    const priceB = b.precios.length > 0 ? Number(b.precios[0].precio) : Infinity;
    return priceA - priceB;
  });

  return ranked;
};
