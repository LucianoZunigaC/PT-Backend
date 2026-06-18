import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const products = await prisma.producto.findMany({
    where: {
      nombre: { contains: 'polpaico', mode: 'insensitive' }
    },
    include: {
      precios: {
        include: { proveedor: true }
      }
    }
  });

  console.log('--- PRODUCTOS CON POLPAICO EN LA DB ---');
  console.log(`Encontrados: ${products.length}`);
  products.forEach(p => {
    console.log(`\nProducto ID: ${p.id}`);
    console.log(`Nombre: "${p.nombre}"`);
    console.log(`Marca: "${p.marca}"`);
    console.log(`Precios:`);
    p.precios.forEach(pr => {
      console.log(`  - [${pr.proveedor?.nombre}] $${pr.precio} (Link: ${pr.link})`);
    });
  });

  await prisma.$disconnect();
}

run();
