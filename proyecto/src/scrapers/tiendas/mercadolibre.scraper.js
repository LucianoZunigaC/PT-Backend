import { BaseScraper } from '../base.scraper.js';

export class MercadoLibreScraper extends BaseScraper {
  constructor() {
    super('MercadoLibre', 'https://listado.mercadolibre.cl');
  }

  // Método de Búsqueda con paginación (PLP - Product List Page)
  // maxProductos controla cuántos quieres en total (default 20)
  async scrape(terminoBusqueda, maxProductos = 20) {
    try {
      await this.init();
      console.log(`[MercadoLibre] Buscando: "${terminoBusqueda}" (max ${maxProductos} productos)`);
      
      const todosLosProductos = [];
      let pagina = 1;
      const porPagina = 48; // MercadoLibre muestra 48 items por página

      while (todosLosProductos.length < maxProductos) {
        const offset = (pagina - 1) * porPagina;
        // Delimitar al dominio de herramientas-construccion nativo de MercadoLibre
        const baseConstruccion = `${this.baseUrl}/herramientas-construccion`;
        const url = pagina === 1
          ? `${baseConstruccion}/${encodeURIComponent(terminoBusqueda)}`
          : `${baseConstruccion}/${encodeURIComponent(terminoBusqueda)}_Desde_${offset + 1}`;

        console.log(`[MercadoLibre] Página ${pagina}: ${url.substring(0, 60)}...`);
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(2500);
        await this.page.waitForSelector('.poly-card', { timeout: 10000 }).catch(() => {});

        const productosPagina = await this.page.evaluate(() => {
          const items = [];
          const elementos = document.querySelectorAll('.poly-card');
          
          elementos.forEach((el) => {
            const titleEl = el.querySelector('.poly-component__title');
            const priceEl = el.querySelector('.poly-price__current .andes-money-amount__fraction');
            
            const nombre = titleEl ? titleEl.innerText.trim() : '';
            const link = titleEl ? titleEl.href : '';
            // En ML la marca/vendedor suele estar en .poly-component__brand
            const marcaEl = el.querySelector('.poly-component__brand, [class*="brand"]');
            const marca = marcaEl ? marcaEl.innerText.trim() : '';

            // Imagen
            const imgEl = el.querySelector('img.poly-component__picture') || el.querySelector('img');
            const imagen = imgEl ? (imgEl.getAttribute('data-src') || imgEl.src) : '';
            
            let precio = 0;
            if (priceEl && priceEl.innerText) {
                const text = priceEl.innerText.replace(/[^0-9]/g, '');
                precio = parseInt(text) || 0;
            }

            if (nombre && precio > 0 && link) {
               items.push({ nombre, marca, link, precio, imagen });
            }
          });
          
          return items;
        });

        if (productosPagina.length === 0) break; // No hay más resultados

        todosLosProductos.push(...productosPagina);
        console.log(`[MercadoLibre] Página ${pagina}: ${productosPagina.length} productos. Total acumulado: ${todosLosProductos.length}`);

        if (todosLosProductos.length >= maxProductos) break;
        pagina++;
      }

      const resultado = todosLosProductos.slice(0, maxProductos);
      console.log(`[MercadoLibre] Extracción completa: ${resultado.length} productos.`);
      return resultado;

    } catch (error) {
      console.error(`[MercadoLibre] Error durante la búsqueda:`, error.message);
      return [];
    } finally {
      await this.close();
    }
  }

  // Método de URL Directa (PDP - Product Detail Page)
  async scrapeUrl(url) {
    try {
      await this.init();
      console.log(`[MercadoLibre] Visitando producto: ${url.substring(0, 50)}...`);
      
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(4000);
      
      const producto = await this.page.evaluate(() => {
        let nombre = 'Sin nombre';
        const titleEl = document.querySelector('h1.ui-pdp-title');
        if (titleEl) nombre = titleEl.innerText.trim();

        let precio = 0;
        // MercadoLibre usa este selector específico para el precio en la página del producto
        const priceEl = document.querySelector('.ui-pdp-price__second-line .andes-money-amount__fraction');
        if (priceEl && priceEl.innerText) {
            // Reemplazamos todo lo que NO sea un número del 0 al 9
            const text = priceEl.innerText.replace(/[^0-9]/g, '');
            precio = parseInt(text) || 0;
        }

        return { nombre, link: window.location.href, precio };
      });

      console.log(`[MercadoLibre] Extraído: ${producto.nombre} - $${producto.precio}`);
      
      return producto.precio > 0 ? [producto] : [];

    } catch (error) {
      console.error(`[MercadoLibre] Error durante el scraping:`, error.message);
      return [];
    } finally {
      await this.close();
    }
  }
}
