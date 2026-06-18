import { ImperialScraper } from './tiendas/imperial.scraper.js';
import { ConstrumartScraper } from './tiendas/construmart.scraper.js';
import { SodimacScraper } from './tiendas/sodimac.scraper.js';
import { EasyScraper } from './tiendas/easy.scraper.js';
import { obtenerObuscarProveedor, guardarResultadosScraping } from '../services/scraping.service.js';
import { prisma } from '../lib/prisma.js';

async function runScrapers() {
  // URLs de ejemplo para actualización directa
  const urlsTrackeadas = [
    { url: 'https://www.imperial.cl/aridos-y-aglomerantes/cemento-melon-especial-saco-25kg/product/132429', tienda: 'Imperial' },
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
    const construmart = new ConstrumartScraper();
    const sodimac = new SodimacScraper();
    const easy = new EasyScraper();

    const imperialDb = await obtenerObuscarProveedor('Imperial');
    const construmartDb = await obtenerObuscarProveedor('Construmart');
    const sodimacDb = await obtenerObuscarProveedor('Sodimac');
    const easyDb = await obtenerObuscarProveedor('Easy');

    // 1. MODO URL EXACTA (Para Imperial)
    console.log('--- FASE 1: ACTUALIZACIÓN POR URL EXACTA ---');
    for (const item of urlsTrackeadas) {
      console.log(`\n--- Procesando URL: ${item.url.substring(0, 50)}... ---`);
      
      if (item.tienda === 'Imperial') {
        const resultado = await imperial.scrapeUrl(item.url);
        if (resultado.length > 0) {
          await guardarResultadosScraping(imperialDb.id, categoria.id, resultado);
          console.log(`[BD] Precio actualizado para producto Imperial.`);
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

      // Descubrir en Construmart (hasta 20 productos por término)
      const resultadosConstrumart = await construmart.scrape(termino, 20);
      if (resultadosConstrumart.length > 0) {
          const guardados = await guardarResultadosScraping(construmartDb.id, categoria.id, resultadosConstrumart);
          console.log(`[BD] ${guardados} productos descubiertos en Construmart para '${termino}'.`);
      }

      // Descubrir en Sodimac (hasta 20 productos por término)
      const resultadosSodimac = await sodimac.scrape(termino, 20);
      if (resultadosSodimac.length > 0) {
          const guardados = await guardarResultadosScraping(sodimacDb.id, categoria.id, resultadosSodimac);
          console.log(`[BD] ${guardados} productos descubiertos en Sodimac para '${termino}'.`);
      }

      // Descubrir en Easy (hasta 20 productos por término)
      const resultadosEasy = await easy.scrape(termino, 20);
      if (resultadosEasy.length > 0) {
          const guardados = await guardarResultadosScraping(easyDb.id, categoria.id, resultadosEasy);
          console.log(`[BD] ${guardados} productos descubiertos en Easy para '${termino}'.`);
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
