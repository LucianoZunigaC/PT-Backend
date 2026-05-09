import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function clean() {
  try {
    console.log('Limpiando base de datos...');
    
    // El orden importa por las claves foráneas (relaciones)
    // Primero borramos las tablas hijas (precios) y luego las padres (productos, proveedores, etc.)
    await prisma.precio.deleteMany();
    await prisma.producto.deleteMany();
    await prisma.proveedor.deleteMany();
    await prisma.categoria.deleteMany();
    
    // Si tuvieras datos de usuarios o búsquedas también los puedes agregar aquí:
    // await prisma.busqueda.deleteMany();
    // await prisma.usuario.deleteMany();

    console.log('¡Base de datos limpiada con éxito!');
  } catch (error) {
    console.error('Error limpiando la base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clean();
