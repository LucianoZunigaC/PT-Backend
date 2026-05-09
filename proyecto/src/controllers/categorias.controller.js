import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const obtenerCategorias = async (req, res, next) => {
  try {
    const categorias = await prisma.categoria.findMany();
    res.json(categorias);
  } catch (error) {
    next(error);
  }
};
