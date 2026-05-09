import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const obtenerObuscarProveedor = async (nombre) => {
  let proveedor = await prisma.proveedor.findFirst({
    where: { nombre: { equals: nombre, mode: 'insensitive' } }
  });

  if (!proveedor) {
    proveedor = await prisma.proveedor.create({
      data: { nombre }
    });
  }
  return proveedor;
};

export const guardarResultadosScraping = async (proveedorId, categoriaId, productosExtraidos) => {
  let guardados = 0;

  for (const item of productosExtraidos) {
    if (!item.precio || item.precio === 0) continue;

    // Buscar si el producto ya existe (por nombre y proveedor)
    let producto = await prisma.producto.findFirst({
      where: { 
        nombre: item.nombre,
        proveedor_id: proveedorId
      }
    });

    if (!producto) {
      producto = await prisma.producto.create({
        data: {
          nombre: item.nombre,
          marca: item.marca || null,
          link: item.link || null,
          proveedor_id: proveedorId,
          categoria_id: categoriaId,
        }
      });
    } else {
      // Actualizar link y marca si se encontró el producto
      await prisma.producto.update({
        where: { id: producto.id },
        data: {
          marca: item.marca || producto.marca,
          link: item.link || producto.link,
        }
      });
    }

    // Registrar precio
    await prisma.precio.create({
      data: {
        producto_id: producto.id,
        proveedor_id: proveedorId,
        precio: item.precio
      }
    });

    guardados++;
  }

  return guardados;
};
