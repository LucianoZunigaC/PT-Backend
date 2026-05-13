import { prisma } from '../lib/prisma.js';

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

    // Normalizar el nombre para mejor matching (minúsculas, sin puntuación)
    const normalizedName = item.nombre.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

    // 1. Buscar si el producto ya existe en la base de datos (incluso de otro proveedor)
    // Buscamos productos que contengan la primera parte del nombre o coincidan exactamente
    const palabras = normalizedName.split(' ');
    const firstTwoWords = palabras.slice(0, 2).join(' ');

    let producto = await prisma.producto.findFirst({
      where: {
        nombre: { contains: firstTwoWords, mode: 'insensitive' }
      }
    });

    // Validar manualmente para evitar falsos positivos
    if (producto) {
       const prodNorm = producto.nombre.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
       if (!prodNorm.includes(firstTwoWords) && !normalizedName.includes(prodNorm.split(' ')[0])) {
           producto = null; // Falso positivo, forzamos creación
       }
    }

    if (!producto) {
      producto = await prisma.producto.create({
        data: {
          nombre: item.nombre,
          marca: item.marca || null,
          imagen: item.imagen || null,
          categoria_id: categoriaId,
        }
      });
    } else {
      // Actualizar imagen si el existente no tenía
      if (!producto.imagen && item.imagen) {
        await prisma.producto.update({
          where: { id: producto.id },
          data: { imagen: item.imagen }
        });
      }
    }

    // Registrar precio y link
    // Verificamos si ya existe un precio de este proveedor para no duplicar entradas innecesariamente
    const precioExistente = await prisma.precio.findFirst({
        where: { producto_id: producto.id, proveedor_id: proveedorId }
    });

    if (precioExistente) {
        await prisma.precio.update({
            where: { id: precioExistente.id },
            data: { 
                precio: item.precio,
                link: item.link || precioExistente.link,
                fecha_actualizacion: new Date()
            }
        });
    } else {
        await prisma.precio.create({
          data: {
            producto_id: producto.id,
            proveedor_id: proveedorId,
            precio: item.precio,
            link: item.link || null
          }
        });
    }

    guardados++;
  }

  return guardados;
};
