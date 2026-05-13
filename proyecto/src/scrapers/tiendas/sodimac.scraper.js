import { BaseScraper } from '../base.scraper.js';

export class SodimacScraper extends BaseScraper {
  constructor() {
    super('Sodimac', 'https://sodimac.falabella.com/sodimac-cl');
  }

  // Helper para buscar los productos recursivamente dentro del JSON anidado
  _findProductsInJson(obj) {
    if (!obj) return [];
    if (Array.isArray(obj) && obj.length > 0 && obj[0].productId) return obj;
    if (typeof obj === 'object') {
      for (let k in obj) {
        const res = this._findProductsInJson(obj[k]);
        if (res.length > 0) return res;
      }
    }
    return [];
  }

  async scrape(terminoBusqueda, maxProductos = 20) {
    try {
      await this.init();
      console.log(`[Sodimac] Buscando: "${terminoBusqueda}" (max ${maxProductos} productos)`);
      
      const url = `${this.baseUrl}/search?Ntt=${encodeURIComponent(terminoBusqueda)}`;
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);

      const html = await this.page.content();
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
      
      if (!nextDataMatch) {
          console.log(`[Sodimac] No se encontró la data JSON en la página.`);
          return [];
      }

      const jsonData = JSON.parse(nextDataMatch[1]);
      const rawProducts = this._findProductsInJson(jsonData);

      const items = [];
      for (const p of rawProducts) {
        if (items.length >= maxProductos) break;
        
        let precio = 0;
        if (p.prices && p.prices.length > 0) {
            // Eliminar puntos de miles y convertir a entero
            const pString = p.prices[0].price[0] || '0';
            precio = parseInt(pString.replace(/\./g, ''));
        }

        let link = p.url || '';
        if (link && !link.startsWith('http')) link = `${this.baseUrl}${link}`;

        let imagen = '';
        if (p.mediaUrls && p.mediaUrls.length > 0) {
            imagen = p.mediaUrls[0];
        }

        if (p.displayName && precio > 0) {
            items.push({
                nombre: p.displayName,
                marca: p.brand || '',
                link: link,
                precio: precio,
                imagen: imagen
            });
        }
      }

      console.log(`[Sodimac] Extracción completa: ${items.length} productos usando API interna.`);
      return items;

    } catch (error) {
      console.error(`[Sodimac] Error durante la búsqueda:`, error.message);
      return [];
    } finally {
      await this.close();
    }
  }

  async scrapeUrl(url) {
    try {
      await this.init();
      console.log(`[Sodimac] Visitando producto: ${url.substring(0, 50)}...`);
      
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
      
      const html = await this.page.content();
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
      
      if (!nextDataMatch) return [];

      const jsonData = JSON.parse(nextDataMatch[1]);
      const rawProducts = this._findProductsInJson(jsonData);
      
      if (rawProducts.length > 0) {
          const p = rawProducts[0];
          let precio = 0;
          if (p.prices && p.prices.length > 0) {
              const pString = p.prices[0].price[0] || '0';
              precio = parseInt(pString.replace(/\./g, ''));
          }
          if (precio > 0) {
              console.log(`[Sodimac] Extraído: ${p.displayName} - $${precio}`);
              return [{ nombre: p.displayName, link: url, precio: precio }];
          }
      }
      return [];

    } catch (error) {
      console.error(`[Sodimac] Error durante el scraping:`, error.message);
      return [];
    } finally {
      await this.close();
    }
  }
}
