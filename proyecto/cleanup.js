import { PrismaClient } from '@prisma/client';
import { esProductoValido } from './src/services/normalization.service.js';

const prisma = new PrismaClient();

async function main() {
    console.log("Iniciando limpieza de la base de datos...");
    const productos = await prisma.producto.findMany();
    let eliminados = 0;

    for (const producto of productos) {
        if (!esProductoValido(producto.nombre)) {
            console.log(`[ELIMINANDO] Producto no válido: "${producto.nombre}"`);
            // Al eliminar el producto, los precios se eliminan en cascada (si está configurado)
            // Borraremos los precios manualmente por si acaso
            await prisma.precio.deleteMany({
                where: { producto_id: producto.id }
            });
            await prisma.producto.delete({
                where: { id: producto.id }
            });
            eliminados++;
        }
    }

    console.log(`Limpieza completada. Se eliminaron ${eliminados} productos basura.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
