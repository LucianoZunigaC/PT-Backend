import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getAllProducts = async ({ limit = 50, offset = 0 }) => {
  return prisma.producto.findMany({
    take: Number(limit),
    skip: Number(offset),
    include: {
      proveedor: true,
      precios: {
        orderBy: { fecha_actualizacion: 'desc' },
        take: 1
      }
    }
  });
};

export const getProductById = async (id) => {
  return prisma.producto.findUnique({
    where: { id: BigInt(id) },
    include: {
      proveedor: true,
      precios: {
        orderBy: { fecha_actualizacion: 'desc' },
        take: 10 // Historial de precios reciente
      }
    }
  });
};
