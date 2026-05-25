import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanLego() {
    try {
        console.log("Limpiando base de datos de productos Lego o asociados...");

        // Buscar productos de marca Lego o que contengan lego en el nombre
        const productosABorrar = await prisma.producto.findMany({
            where: {
                OR: [
                    { nombre: { contains: 'lego', mode: 'insensitive' } },
                    { marca: { contains: 'lego', mode: 'insensitive' } }
                ]
            }
        });

        console.log(`Encontrados ${productosABorrar.length} productos para eliminar.`);

        let eliminados = 0;
        for (const prod of productosABorrar) {
            // Borrar precios asociados
            await prisma.precio.deleteMany({
                where: { producto_id: prod.id }
            });
            
            // Borrar producto
            await prisma.producto.delete({
                where: { id: prod.id }
            });
            eliminados++;
        }

        console.log(`Limpieza completada. ${eliminados} productos eliminados.`);

    } catch (error) {
        console.error("Error limpiando BD:", error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanLego();
