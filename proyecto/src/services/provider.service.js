import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getAllProviders = async () => {
  return prisma.proveedor.findMany({
    include: {
      _count: {
        select: { productos: true }
      }
    }
  });
};

export const getProviderById = async (id) => {
  return prisma.proveedor.findUnique({
    where: { id: BigInt(id) },
    include: {
      productos: { take: 10 }
    }
  });
};
