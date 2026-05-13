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
      
      // Formato que verificamos que SI funciona
      const url = `${this.baseUrl}/search?Ntt=${encodeURIComponent(terminoBusqueda)}`;
      console.log(`[Construmart] Navegando a: ${url}`);
      
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      // Espera fija de 5 segundos que demostró funcionar perfectamente en la prueba manual
      console.log(`[Construmart] Esperando renderizado dinámico de Magento (5s)...`);
      await page.waitForTimeout(5000);

      const actualUrl = page.url();
      console.log(`[Construmart] URL real alcanzada: ${actualUrl}`);

      console.log(`[Construmart] Extrayendo resultados de búsqueda...`);
      const debugData = await page.evaluate(() => {
        const cards = document.querySelectorAll('.product-item');
        const matches = [];
        
        cards.forEach((card) => {
          const nombreEl = card.querySelector('.product-item-name a') || card.querySelector('.product-item-link') || card.querySelector('a');
          const priceEl = card.querySelector('.price');
          matches.push({
             hasNombre: !!nombreEl,
             nombreText: nombreEl ? nombreEl.innerText : 'NULL',
             hasPrecio: !!priceEl,
             precioText: priceEl ? priceEl.innerText : 'NULL'
          });
        });

        return {
           totalCards: cards.length,
           bodyLength: document.body.innerHTML.length,
           includesItem: document.body.innerHTML.includes('product-item'),
           matches
        };
      });

      console.log(`[Construmart] DATOS DEBUG:`, JSON.stringify(debugData, null, 2));
      
      const productos = await page.evaluate(() => {
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

      console.log(`[Construmart] ${productos.length} productos encontrados.`);
      return productos.slice(0, maxProductos);

    } catch (error) {
      console.error(`[Construmart] Error durante la búsqueda:`, error.message);
      return [];
    } finally {
      if (browser) await browser.close();
    }
  }

  async scrapeUrl(url) {
     // Simular igual que el otro
     return [];
  }
}
