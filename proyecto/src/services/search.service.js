import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const searchCatalog = async (queryTerm) => {
  return prisma.producto.findMany({
    where: {
      OR: [
        { nombre: { contains: queryTerm, mode: 'insensitive' } },
        { marca: { contains: queryTerm, mode: 'insensitive' } },
        { descripcion: { contains: queryTerm, mode: 'insensitive' } }
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
};
