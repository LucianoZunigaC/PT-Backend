import { ImperialScraper } from './tiendas/imperial.scraper.js';
import { MercadoLibreScraper } from './tiendas/mercadolibre.scraper.js';
import { SodimacScraper } from './tiendas/sodimac.scraper.js';
import { obtenerObuscarProveedor, guardarResultadosScraping } from '../services/scraping.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runScrapers() {
  // URLs de ejemplo para actualización directa
  const urlsTrackeadas = [
    { url: 'https://www.imperial.cl/aridos-y-aglomerantes/cemento-melon-especial-saco-25kg/product/132429', tienda: 'Imperial' },
    { url: 'https://articulo.mercadolibre.cl/MLC-3523805292-martillo-carpintero-24oz-mango-antideslizante-_JM', tienda: 'MercadoLibre' }
  ];
  
  console.log('====================================');
  console.log(' INICIANDO ORQUESTADOR HÍBRIDO');
  console.log('====================================\n');

  try {
    let categoria = await prisma.categoria.findFirst({ where: { nombre: 'Materiales Varios' }});
    if (!categoria) {
      categoria = await prisma.categoria.create({ data: { nombre: 'Materiales Varios' }});
    }

    const imperial = new ImperialScraper();
    const mercadolibre = new MercadoLibreScraper();
    const sodimac = new SodimacScraper();

    const imperialDb = await obtenerObuscarProveedor('Imperial');
    const mlDb = await obtenerObuscarProveedor('MercadoLibre');
    const sodimacDb = await obtenerObuscarProveedor('Sodimac');

    // 1. MODO URL EXACTA (Para Imperial y ML)
    console.log('--- FASE 1: ACTUALIZACIÓN POR URL EXACTA ---');
    for (const item of urlsTrackeadas) {
      console.log(`\n--- Procesando URL: ${item.url.substring(0, 50)}... ---`);
      
      if (item.tienda === 'Imperial') {
        const resultado = await imperial.scrapeUrl(item.url);
        if (resultado.length > 0) {
          await guardarResultadosScraping(imperialDb.id, categoria.id, resultado);
          console.log(`[BD] Precio actualizado para producto Imperial.`);
        }
      } else if (item.tienda === 'MercadoLibre') {
        const resultado = await mercadolibre.scrapeUrl(item.url);
        if (resultado.length > 0) {
          await guardarResultadosScraping(mlDb.id, categoria.id, resultado);
          console.log(`[BD] Precio actualizado para producto MercadoLibre.`);
        }
      }
    }

    // 2. MODO BUSCADOR / DESCUBRIMIENTO
    console.log('\n--- FASE 2: BÚSQUEDA Y DESCUBRIMIENTO AUTOMÁTICO ---');
    const terminosDeBusqueda = ['cemento', 'martillo'];
    
    for (const termino of terminosDeBusqueda) {
      console.log(`\n=== Buscando término: ${termino} ===`);
      
      // Descubrir en Imperial (hasta 20 productos por término)
      const resultadosImp = await imperial.scrape(termino, 20);
      if (resultadosImp.length > 0) {
          const guardados = await guardarResultadosScraping(imperialDb.id, categoria.id, resultadosImp);
          console.log(`[BD] ${guardados} productos descubiertos en Imperial para '${termino}'.`);
      }

      // Descubrir en MercadoLibre (hasta 30 productos por término)
      const resultadosML = await mercadolibre.scrape(termino, 30);
      if (resultadosML.length > 0) {
          const guardados = await guardarResultadosScraping(mlDb.id, categoria.id, resultadosML);
          console.log(`[BD] ${guardados} productos descubiertos en MercadoLibre para '${termino}'.`);
      }

      // Descubrir en Sodimac (hasta 20 productos por término)
      const resultadosSodimac = await sodimac.scrape(termino, 20);
      if (resultadosSodimac.length > 0) {
          const guardados = await guardarResultadosScraping(sodimacDb.id, categoria.id, resultadosSodimac);
          console.log(`[BD] ${guardados} productos descubiertos en Sodimac para '${termino}'.`);
      }
    }

  } catch (error) {
    console.error('Error fatal en el orquestador:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n====================================');
    console.log(' PROCESO DE SCRAPING FINALIZADO');
    console.log('====================================');
  }
}

runScrapers();
