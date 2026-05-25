import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanBasura() {
    try {
        console.log("Limpiando base de datos de productos basura...");

        const productosABorrar = await prisma.producto.findMany({
            where: {
                OR: [
                    { nombre: { contains: 'hot wheel', mode: 'insensitive' } },
                    { marca: { contains: 'hot wheel', mode: 'insensitive' } },
                    { nombre: { contains: 'paw patrol', mode: 'insensitive' } }
                ]
            }
        });

        console.log(`Encontrados ${productosABorrar.length} productos para eliminar.`);

        let eliminados = 0;
        for (const prod of productosABorrar) {
            await prisma.precio.deleteMany({
                where: { producto_id: prod.id }
            });
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

cleanBasura();
