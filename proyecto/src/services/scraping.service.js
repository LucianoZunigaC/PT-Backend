import { prisma } from '../lib/prisma.js';
import { normalizarProducto, esMatchSeguro, esProductoValido, generarFingerprint } from './normalization.service.js';

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
    const fingerprint = generarFingerprint(item.nombre, item.marca);

    let producto = null;

    // ── Estrategia 1: Búsqueda por fingerprint (rápida y precisa) ──────
    if (fingerprint) {
      producto = await prisma.producto.findFirst({
        where: { fingerprint }
      });
    }

    // ── Estrategia 2: Búsqueda fuzzy por tokens (fallback) ─────────────
    if (!producto && tokens.length > 0) {
      // Buscar candidatos usando los primeros 2 tokens para acotar la búsqueda
      const condicionesBusqueda = tokens.slice(0, 2).map(t => ({
        nombre: { contains: t, mode: 'insensitive' }
      }));

      const candidatos = await prisma.producto.findMany({
        where: {
          AND: condicionesBusqueda
        },
        take: 50 // Limitar para no sobrecargar
      });

      // Evaluar con esMatchSeguro (ponderado) y verificación de marca
      for (const cand of candidatos) {
         // Verificación de marca por contención (no igualdad exacta)
         if (item.marca && cand.marca) {
             const brandItem = item.marca.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
             const brandCand = cand.marca.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
             // Usar contención en lugar de igualdad exacta (ej: "Bosch" ⊂ "Bosch Professional")
             if (!brandItem.includes(brandCand) && !brandCand.includes(brandItem)) {
                 continue;
             }
         }

         const candNorm = normalizarProducto(cand.nombre);
         if (esMatchSeguro(tokens, candNorm.tokens, 0.55)) {
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
          fingerprint: fingerprint || null,
          categoria_id: categoriaId,
        }
      });
    } else {
      // Actualizar datos faltantes del producto existente
      const updates = {};
      if (!producto.imagen && item.imagen) updates.imagen = item.imagen;
      if (!producto.fingerprint && fingerprint) updates.fingerprint = fingerprint;
      if (!producto.marca && item.marca) updates.marca = item.marca;
      
      if (Object.keys(updates).length > 0) {
        await prisma.producto.update({
          where: { id: producto.id },
          data: updates
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
  const { ConstrumartScraper } = await import('../scrapers/tiendas/construmart.scraper.js');
  const { SodimacScraper } = await import('../scrapers/tiendas/sodimac.scraper.js');
  const { ImperialScraper } = await import('../scrapers/tiendas/imperial.scraper.js');

  let categoria = await prisma.categoria.findFirst({ where: { nombre: 'Materiales Varios' }});
  if (!categoria) {
    categoria = await prisma.categoria.create({ data: { nombre: 'Materiales Varios' }});
  }

  const construmartDb = await obtenerObuscarProveedor('Construmart');
  const sodimacDb = await obtenerObuscarProveedor('Sodimac');
  const imperialDb = await obtenerObuscarProveedor('Imperial');

  let totalGuardados = 0;

  try {
    // Scraping en paralelo para ser más rápidos
    const construmart = new ConstrumartScraper();
    const sodimac = new SodimacScraper();
    const imperial = new ImperialScraper();

    console.log(`[Scraping Dinámico] Iniciando scrapers concurrentes para: ${termino}`);
    const [resultadosConstrumart, resultadosSodimac, resultadosImperial] = await Promise.all([
      construmart.scrape(termino, 12).catch(() => []),
      sodimac.scrape(termino, 12).catch(() => []),
      imperial.scrape(termino, 12).catch(() => [])
    ]);

    if (resultadosConstrumart.length > 0) {
      totalGuardados += await guardarResultadosScraping(construmartDb.id, categoria.id, resultadosConstrumart);
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
