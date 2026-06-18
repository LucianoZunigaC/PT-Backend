import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const products = await prisma.producto.findMany({
    include: {
      precios: {
        include: { proveedor: true }
      }
    }
  });

  const multiPrice = products.filter(p => p.precios.length > 1);

  console.log('--- PRODUCTOS CON MULTIPLES PRECIOS EN LA DB ---');
  console.log(`Encontrados: ${multiPrice.length}`);
  multiPrice.forEach(p => {
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
