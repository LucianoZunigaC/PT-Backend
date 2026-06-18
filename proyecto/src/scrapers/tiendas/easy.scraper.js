import { BaseScraper } from '../base.scraper.js';

export class EasyScraper extends BaseScraper {
  constructor() {
    super('Easy', 'https://www.easy.cl');
  }

  async scrape(terminoBusqueda, maxProductos = 20) {
    try {
      await this.init();
      console.log(`[Easy] Buscando: "${terminoBusqueda}" (max ${maxProductos} productos)`);

      const todosLosProductos = [];
      let pagina = 1;

      console.log(`[Easy] Inicializando búsqueda interactiva desde la portada para evadir protección bot...`);
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });

      // Click and type on the search bar
      const searchSelector = 'input[placeholder*="Buscar"], input[type="text"], input.vtex-styleguide-9-x-input';
      await this.page.waitForSelector(searchSelector, { state: 'visible', timeout: 15000 });
      await this.page.click(searchSelector);
      await this.page.waitForTimeout(1000);
      await this.page.type(searchSelector, terminoBusqueda, { delay: 100 });
      
      console.log(`[Easy] Presionando Enter...`);
      await this.page.keyboard.press('Enter');
      
      console.log(`[Easy] Esperando carga de resultados (8s)...`);
      await this.page.waitForTimeout(8000);

      // Scroll multiple times to trigger lazy loading
      for (let s = 0; s < 3; s++) {
        await this.page.evaluate(() => window.scrollBy(0, 1000));
        await this.page.waitForTimeout(1500);
      }

      console.log(`[Easy] Extrayendo productos...`);
      const productosPagina = await this.page.evaluate(() => {
        const items = [];
        // Nuevo selector basado en los atributos data de Easy
        const cards = document.querySelectorAll('div[data-cnstrc-item-id]');

        cards.forEach((card) => {
          const nombreEl = card.querySelector('span[data-id^="product-name"]');
          if (!nombreEl) return;
          const nombre = nombreEl.innerText.trim();

          let link = '';
          const linkEl = card.querySelector('a');
          if (linkEl) link = linkEl.href;

          let marca = '';
          const marcaEl = card.querySelector('span[data-id^="product-brand"]');
          if (marcaEl) marca = marcaEl.innerText.trim();

          let precio = 0;
          const priceAttr = card.getAttribute('data-cnstrc-item-price');
          if (priceAttr) {
            precio = parseInt(priceAttr);
          } else {
             // Fallback
             const priceEl = card.querySelector('div[class*="jWCMCt"], div:contains("$")');
             if (priceEl && priceEl.innerText) {
                 const text = priceEl.innerText.replace(/[^0-9]/g, '');
                 if (text.length >= 3) precio = parseInt(text);
             }
          }

          let imagen = '';
          const imgEl = card.querySelector('img');
          if (imgEl) imagen = imgEl.src || imgEl.getAttribute('src');

          if (precio > 0) {
            items.push({ nombre, marca, link, precio, imagen });
          }
        });
        return items;
      });

      if (productosPagina.length === 0) {
        console.log(`[Easy] No se encontraron productos o los selectores están desactualizados.`);
      }

      const resultado = productosPagina.slice(0, maxProductos);
      console.log(`[Easy] Extracción completa: ${resultado.length} productos.`);
      return resultado;

    } catch (error) {
      console.error(`[Easy] Error durante la búsqueda:`, error.message);
      return [];
    } finally {
      await this.close();
    }
  }

  async scrapeUrl(url) {
    try {
      await this.init();
      console.log(`[Easy] Visitando producto: ${url.substring(0, 50)}...`);
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(4000);

      const data = await this.page.evaluate(() => {
        let precio = 0;
        const priceEl = document.querySelector('.vtex-product-price-1-x-currencyContainer');
        if (priceEl && priceEl.innerText) {
          precio = parseInt(priceEl.innerText.replace(/[^0-9]/g, ''));
        }
        
        let nombre = '';
        const nameEl = document.querySelector('.vtex-store-components-3-x-productBrand');
        if (nameEl) nombre = nameEl.innerText.trim();

        let imagen = '';
        const imgEl = document.querySelector('.vtex-store-components-3-x-productImageTag');
        if (imgEl) imagen = imgEl.src;

        return { precio, nombre, imagen };
      });

      console.log(`[Easy] Datos extraídos para la URL: Precio = ${data.precio}`);
      return data.precio > 0 ? data : null;

    } catch (error) {
      console.error(`[Easy] Error extrayendo URL ${url}:`, error.message);
      return null;
    } finally {
      await this.close();
    }
  }
}
