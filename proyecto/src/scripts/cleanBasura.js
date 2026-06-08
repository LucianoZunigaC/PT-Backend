import { PrismaClient } from '@prisma/client';
import { esProductoValido } from '../services/normalization.service.js';

const prisma = new PrismaClient();

async function cleanBasura() {
    try {
        console.log("Limpiando base de datos de productos basura/inválidos...");

        const todosLosProductos = await prisma.producto.findMany();
        
        const productosABorrar = todosLosProductos.filter(
            p => !esProductoValido(p.nombre) || (p.marca && !esProductoValido(p.marca))
        );

        console.log(`Encontrados ${productosABorrar.length} productos para eliminar.`);

        let eliminados = 0;
        for (const prod of productosABorrar) {
            // Eliminar precios asociados
            await prisma.precio.deleteMany({
                where: { producto_id: prod.id }
            });
            // Eliminar redirecciones asociadas
            await prisma.redireccion.deleteMany({
                where: { producto_id: prod.id }
            });
            // Eliminar producto
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
