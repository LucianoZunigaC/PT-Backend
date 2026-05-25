import { prisma } from '../lib/prisma.js';
import { normalizarProducto, esMatchSeguro, esProductoValido } from './normalization.service.js';

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
    
    if (!esProductoValido(item.nombre)) continue;

    const { normalizado, tokens } = normalizarProducto(item.nombre);

    let producto = null;
    if (tokens.length > 0) {
      // Tomamos los 2 primeros tokens fuertes como heurística para acotar la búsqueda en DB
      const searchStr = tokens.slice(0, 2).join(' ');
      
      const candidatos = await prisma.producto.findMany({
        where: {
          nombre: { contains: tokens[0], mode: 'insensitive' }
        }
      });

      // Evaluar con Jaccard (esMatchSeguro)
      for (const cand of candidatos) {
         const candNorm = normalizarProducto(cand.nombre);
         if (esMatchSeguro(tokens, candNorm.tokens, 0.65)) {
             producto = cand;
             break;
         }
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

// Nueva función para hacer scraping en vivo si no se encuentran productos
export const ejecutarScrapingDinamico = async (termino) => {
  // 1. Bloqueo Prematuro (Ahorro de recursos)
  if (!esProductoValido(termino)) {
      console.log(`[Scraping Dinámico] Abortado: El término "${termino}" está en la lista de exclusión estricta.`);
      return 0;
  }

  // Importaciones dinámicas para evitar problemas si los archivos son movidos
  const { MercadoLibreScraper } = await import('../scrapers/tiendas/mercadolibre.scraper.js');
  const { SodimacScraper } = await import('../scrapers/tiendas/sodimac.scraper.js');
  const { ImperialScraper } = await import('../scrapers/tiendas/imperial.scraper.js');

  let categoria = await prisma.categoria.findFirst({ where: { nombre: 'Materiales Varios' }});
  if (!categoria) {
    categoria = await prisma.categoria.create({ data: { nombre: 'Materiales Varios' }});
  }

  const mlDb = await obtenerObuscarProveedor('MercadoLibre');
  const sodimacDb = await obtenerObuscarProveedor('Sodimac');
  const imperialDb = await obtenerObuscarProveedor('Imperial');

  let totalGuardados = 0;

  try {
    // Scraping en paralelo para ser más rápidos
    const mercadolibre = new MercadoLibreScraper();
    const sodimac = new SodimacScraper();
    const imperial = new ImperialScraper();

    console.log(`[Scraping Dinámico] Iniciando scrapers concurrentes para: ${termino}`);
    const [resultadosML, resultadosSodimac, resultadosImperial] = await Promise.all([
      mercadolibre.scrape(termino, 12).catch(() => []),
      sodimac.scrape(termino, 12).catch(() => []),
      imperial.scrape(termino, 12).catch(() => [])
    ]);

    if (resultadosML.length > 0) {
      totalGuardados += await guardarResultadosScraping(mlDb.id, categoria.id, resultadosML);
    }
    if (resultadosSodimac.length > 0) {
      totalGuardados += await guardarResultadosScraping(sodimacDb.id, categoria.id, resultadosSodimac);
    }
    if (resultadosImperial.length > 0) {
      totalGuardados += await guardarResultadosScraping(imperialDb.id, categoria.id, resultadosImperial);
    }
  } catch (error) {
    console.error(`[Scraping Dinámico] Error:`, error);
  }

  return totalGuardados;
};
