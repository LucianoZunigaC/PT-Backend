import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== PRODUCTOS EN EL RANGO DE ID 1200 a 1260 ===');
  const productos = await prisma.producto.findMany({
    where: {
      id: {
        gte: 1200,
        lte: 1260
      }
    },
    include: {
      categoria: true,
      precios: {
        include: { proveedor: true }
      }
    }
  });

  productos.forEach(p => {
    const provs = p.precios.map(pr => `${pr.proveedor?.nombre}: $${pr.precio}`).join(', ');
    console.log(`ID: ${p.id} | Nombre: ${p.nombre} | Categoría: ${p.categoria?.nombre} | Precios: [${provs}]`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
