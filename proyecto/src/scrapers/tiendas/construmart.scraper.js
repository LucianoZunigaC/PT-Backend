import { chromium } from 'playwright';

export class ConstrumartScraper {
  constructor() {
    this.baseUrl = 'https://www.construmart.cl';
  }

  async scrape(terminoBusqueda, maxProductos = 20) {
    let browser;
    try {
      console.log(`[Construmart] Inicializando scraper limpio (sin plugins)...`);
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      const todosLosProductos = [];
      let pagina = 1;

      while (todosLosProductos.length < maxProductos) {
        try {
          const url = `${this.baseUrl}/search?Ntt=${encodeURIComponent(terminoBusqueda)}&p=${pagina}`;
          console.log(`[Construmart] Navegando a la página ${pagina}: ${url}`);

          await page.goto(url, { waitUntil: 'domcontentloaded' });

          console.log(`[Construmart] Esperando renderizado dinámico de Magento (5s)...`);
          await page.waitForTimeout(5000);

          const actualUrl = page.url();
          console.log(`[Construmart] URL real alcanzada: ${actualUrl}`);

          const productosPagina = await page.evaluate(() => {
            const items = [];
            const cards = document.querySelectorAll('.product-item');

            cards.forEach((card) => {
              const nombreEl = card.querySelector('.product-item-name a') || card.querySelector('.product-item-link') || card.querySelector('a');
              if (!nombreEl) return;

              const nombre = nombreEl.innerText.trim();
              const link = nombreEl.href;

              let marca = '';
              const marcaEl = card.querySelector('.marca, .brand');
              if (marcaEl) marca = marcaEl.innerText.trim();

              let precio = 0;
              const priceEl = card.querySelector('.price');
              if (priceEl && priceEl.innerText) {
                const text = priceEl.innerText.replace(/[^0-9]/g, '');
                if (text.length >= 3) {
                  precio = parseInt(text);
                }
              }

              let imagen = '';
              const imgEl = card.querySelector('.product-image-photo');
              if (imgEl) {
                imagen = imgEl.src || imgEl.getAttribute('src');
              }

              if (precio > 0) {
                items.push({ nombre, marca, link, precio, imagen });
              }
            });
            return items;
          });

          if (productosPagina.length === 0) {
            console.log(`[Construmart] No se encontraron más productos en la página ${pagina}.`);
            break;
          }

          todosLosProductos.push(...productosPagina);
          console.log(`[Construmart] Página ${pagina}: ${productosPagina.length} productos. Total acumulado: ${todosLosProductos.length}`);

          if (todosLosProductos.length >= maxProductos) break;
          pagina++;
        } catch (pageError) {
          console.error(`[Construmart] Error al procesar página ${pagina}:`, pageError.message);
          break; // Detener la paginación pero conservar los productos ya extraídos
        }
      }

      const resultado = todosLosProductos.slice(0, maxProductos);
      console.log(`[Construmart] Extracción completa: ${resultado.length} productos.`);
      return resultado;

    } catch (error) {
      console.error(`[Construmart] Error durante la búsqueda:`, error.message);
      return [];
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error(`[Construmart] Error al cerrar el navegador:`, closeError.message);
        }
      }
    }
  }

  async scrapeUrl(url) {
    let browser;
    try {
      console.log(`[Construmart] Visitando producto: ${url.substring(0, 50)}...`);
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);

      const producto = await page.evaluate(() => {
        let nombre = 'Sin nombre';
        const titleEl = document.querySelector('.page-title') || document.querySelector('h1');
        if (titleEl) nombre = titleEl.innerText.trim();

        let marca = '';
        const brandEl = document.querySelector('.brand') || document.querySelector('[class*="brand"]') || document.querySelector('.marca');
        if (brandEl) marca = brandEl.innerText.trim();

        let imagen = '';
        const imgEl = document.querySelector('.gallery-placeholder img') || document.querySelector('.product-image-photo') || document.querySelector('img');
        if (imgEl) imagen = imgEl.src || imgEl.getAttribute('src') || '';

        let precio = 0;
        const priceEl = document.querySelector('.price-box .price') || document.querySelector('.price');
        if (priceEl && priceEl.innerText) {
          const text = priceEl.innerText.replace(/[^0-9]/g, '');
          if (text.length >= 3) {
            precio = parseInt(text);
          }
        }

        return { nombre, marca, link: window.location.href, precio, imagen };
      });

      console.log(`[Construmart] Extraído: ${producto.nombre} - $${producto.precio}`);
      return producto.precio > 0 ? [producto] : [];
    } catch (error) {
      console.error(`[Construmart] Error durante el scraping de URL:`, error.message);
      return [];
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error(`[Construmart] Error al cerrar el navegador:`, closeError.message);
        }
      }
    }
  }
}
