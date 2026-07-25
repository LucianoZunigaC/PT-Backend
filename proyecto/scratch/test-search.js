import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testSearch(q) {
  console.log(`\n=== PROBANDO BÚSQUEDA FLEXIBLE PARA: "${q}" ===`);
  const words = q.split(/\s+/).filter(w => w.trim().length > 1);
  const where = {};
  if (words.length > 0) {
    where.AND = words.map(word => ({
      OR: [
        { nombre: { contains: word, mode: 'insensitive' } },
        { marca:  { contains: word, mode: 'insensitive' } },
      ]
    }));
  }

  const productos = await prisma.producto.findMany({
    where,
    include: {
      precios: {
        include: { proveedor: true }
      }
    }
  });

  console.log(`Encontrados: ${productos.length}`);
  productos.slice(0, 5).forEach(p => {
    console.log(`- ID: ${p.id} | Nombre: ${p.nombre} | Marca: ${p.marca}`);
  });
}

async function main() {
  await testSearch('arena gruesa');
  await testSearch('varilla corrugada');
  await testSearch('fierro');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
