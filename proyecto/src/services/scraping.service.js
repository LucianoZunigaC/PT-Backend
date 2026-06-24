/**
 * scraping.service.js
 * Servicio centralizado de guardado de resultados de scraping.
 * 
 * Mejoras implementadas:
 * - Matching cross-marca: dos productos con distinta marca pueden unificarse si son físicamente idénticos.
 * - Guarda descripción y especificaciones técnicas capturadas por los scrapers.
 * - Historial de precios por snapshot (modelo HistorialPrecio) desacoplado del precio actual.
 * - Upsert atómico de precios usando constraint única (producto_id, proveedor_id).
 */

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

/**
 * Guarda o actualiza un lote de productos extraídos por scraping.
 * Implementa matching cruzado por fingerprint + similitud Jaccard ponderada.
 * Guarda snapshot de historial cada vez que el precio cambia.
 * 
 * @param {BigInt} proveedorId
 * @param {BigInt} categoriaId
 * @param {Array} productosExtraidos - [{nombre, marca, precio, link, imagen, descripcion, especificaciones}]
 */
export const guardarResultadosScraping = async (proveedorId, categoriaId, productosExtraidos) => {
  let guardados = 0;

  for (const item of productosExtraidos) {
    if (!item.precio || item.precio === 0) continue;
    if (!esProductoValido(item.nombre)) continue;

    const { normalizado, tokens } = normalizarProducto(item.nombre);
    // fingerprint SIN marca: esto permite agrupar "Cemento 25kg" de cualquier tienda aunque tenga distintas marcas
    const fingerprintSinMarca = generarFingerprint(item.nombre, null);
    // fingerprint CON marca: para productos donde la marca SÍ importa (herramientas, etc.)
    const fingerprintConMarca = generarFingerprint(item.nombre, item.marca);

    let producto = null;

    // ── Estrategia 1: Match exacto por fingerprint sin marca (agrupa distintas marcas del mismo producto físico)
    if (fingerprintSinMarca) {
      producto = await prisma.producto.findFirst({
        where: { fingerprint: fingerprintSinMarca }
      });
    }

    // ── Estrategia 2: Match exacto por fingerprint con marca
    if (!producto && fingerprintConMarca && fingerprintConMarca !== fingerprintSinMarca) {
      producto = await prisma.producto.findFirst({
        where: { fingerprint: fingerprintConMarca }
      });
    }

    // ── Estrategia 3: Búsqueda fuzzy por similitud Jaccard ponderada (cross-marca)
    if (!producto && tokens.length > 0) {
      // Buscar candidatos usando los primeros 2 tokens descriptivos para acotar
      const condicionesBusqueda = tokens.slice(0, 2).map(t => ({
        nombre: { contains: t, mode: 'insensitive' }
      }));

      const candidatos = await prisma.producto.findMany({
        where: { AND: condicionesBusqueda },
        take: 50
      });

      // Evaluar similitud ponderada, sin requerir misma marca (cross-marca intencional)
      for (const cand of candidatos) {
        const candNorm = normalizarProducto(cand.nombre);
        if (esMatchSeguro(tokens, candNorm.tokens, 0.60)) {
          producto = cand;
          break;
        }
      }
    }

    // ── Si no hay match: crear producto nuevo
    if (!producto) {
      const especsParaGuardar = item.especificaciones && Object.keys(item.especificaciones).length > 0
        ? item.especificaciones
        : undefined;

      producto = await prisma.producto.create({
        data: {
          nombre: item.nombre,
          marca: item.marca || null,
          imagen: item.imagen || null,
          descripcion: item.descripcion || null,
          especificaciones: especsParaGuardar,
          fingerprint: fingerprintSinMarca || null,
          categoria_id: categoriaId,
        }
      });
    } else {
      // ── Actualizar campos faltantes del producto existente
      const updates = {};
      if (!producto.imagen && item.imagen) updates.imagen = item.imagen;
      if (!producto.fingerprint && fingerprintSinMarca) updates.fingerprint = fingerprintSinMarca;
      if (!producto.marca && item.marca) updates.marca = item.marca;
      if (!producto.descripcion && item.descripcion) updates.descripcion = item.descripcion;
      // Enriquecer especificaciones: merge de las existentes con las nuevas
      if (item.especificaciones && Object.keys(item.especificaciones).length > 0) {
        const existentes = (producto.especificaciones && typeof producto.especificaciones === 'object')
          ? producto.especificaciones
          : {};
        updates.especificaciones = { ...existentes, ...item.especificaciones };
      }

      if (Object.keys(updates).length > 0) {
        await prisma.producto.update({
          where: { id: producto.id },
          data: updates
        });
      }
    }

    // ── Upsert precio actual (constraint única: producto_id + proveedor_id)
    const precioAnterior = await prisma.precio.findFirst({
      where: { producto_id: producto.id, proveedor_id: proveedorId }
    });

    const precioNuevo = item.precio;

    await prisma.precio.upsert({
      where: {
        producto_id_proveedor_id: {
          producto_id: producto.id,
          proveedor_id: proveedorId
        }
      },
      update: {
        precio: precioNuevo,
        link: item.link || undefined,
        fecha_actualizacion: new Date()
      },
      create: {
        producto_id: producto.id,
        proveedor_id: proveedorId,
        precio: precioNuevo,
        link: item.link || null
      }
    });

    // ── Guardar snapshot en historial SÓLO si el precio cambió (o es nuevo)
    const precioAnteriorNum = precioAnterior ? Number(precioAnterior.precio) : null;
    if (precioAnteriorNum === null || Math.abs(precioAnteriorNum - Number(precioNuevo)) > 0) {
      await prisma.historialPrecio.create({
        data: {
          producto_id: producto.id,
          precio: precioNuevo,
        }
      });
    }

    guardados++;
  }

  return guardados;
};

/**
 * Ejecuta scraping dinámico en paralelo para un término de búsqueda.
 * Guarda los resultados en la BD para cachear para futuros usuarios.
 */
export const ejecutarScrapingDinamico = async (termino) => {
  if (!esProductoValido(termino)) {
    console.log(`[Scraping Dinámico] Abortado: El término "${termino}" está en la lista de exclusión.`);
    return 0;
  }

  const { ConstrumartScraper } = await import('../scrapers/tiendas/construmart.scraper.js');
  const { SodimacScraper } = await import('../scrapers/tiendas/sodimac.scraper.js');
  const { ImperialScraper } = await import('../scrapers/tiendas/imperial.scraper.js');

  let categoria = await prisma.categoria.findFirst({ where: { nombre: 'Materiales Varios' } });
  if (!categoria) {
    categoria = await prisma.categoria.create({ data: { nombre: 'Materiales Varios' } });
  }

  const construmartDb = await obtenerObuscarProveedor('Construmart');
  const sodimacDb = await obtenerObuscarProveedor('Sodimac');
  const imperialDb = await obtenerObuscarProveedor('Imperial');

  let totalGuardados = 0;

  try {
    const construmart = new ConstrumartScraper();
    const sodimac = new SodimacScraper();
    const imperial = new ImperialScraper();

    console.log(`[Scraping Dinámico] Iniciando scrapers concurrentes para: ${termino}`);
    const [resultadosConstrumart, resultadosSodimac, resultadosImperial] = await Promise.all([
      construmart.scrape(termino, 12).catch(() => []),
      sodimac.scrape(termino, 12).catch(() => []),
      imperial.scrape(termino, 12).catch(() => [])
    ]);

    if (resultadosConstrumart.length > 0)
      totalGuardados += await guardarResultadosScraping(construmartDb.id, categoria.id, resultadosConstrumart);
    if (resultadosSodimac.length > 0)
      totalGuardados += await guardarResultadosScraping(sodimacDb.id, categoria.id, resultadosSodimac);
    if (resultadosImperial.length > 0)
      totalGuardados += await guardarResultadosScraping(imperialDb.id, categoria.id, resultadosImperial);

  } catch (error) {
    console.error(`[Scraping Dinámico] Error:`, error);
  }

  return totalGuardados;
};
