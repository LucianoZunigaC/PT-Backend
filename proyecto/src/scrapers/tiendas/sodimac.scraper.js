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

      const items = [];
      let pagina = 1;
      const categoriasValidas = ['ferretería', 'construcción', 'herramientas', 'seguridad', 'baño', 'cocina', 'pintura', 'pisos', 'madera', 'electricidad', 'gasfitería', 'jardín', 'materiales'];

      while (items.length < maxProductos) {
        try {
          const url = `${this.baseUrl}/search?Ntt=${encodeURIComponent(terminoBusqueda)}&page=${pagina}`;
          console.log(`[Sodimac] Página ${pagina}: ${url}`);

          await this.page.goto(url, { waitUntil: 'domcontentloaded' });
          await this.page.waitForTimeout(2000);

          const html = await this.page.content();
          const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);

          if (!nextDataMatch) {
            console.log(`[Sodimac] No se encontró la data JSON en la página ${pagina}.`);
            break;
          }

          const jsonData = JSON.parse(nextDataMatch[1]);
          const rawProducts = this._findProductsInJson(jsonData);

          if (rawProducts.length === 0) {
            console.log(`[Sodimac] No se encontraron más productos en la página ${pagina}.`);
            break;
          }

          let nuevosProductos = 0;
          for (const p of rawProducts) {
            if (items.length >= maxProductos) break;

            // Validar categoría dinámicamente
            let esCategoriaValida = false;
            if (p.categories && Array.isArray(p.categories)) {
              for (const cat of p.categories) {
                if (!cat.name) continue;
                const catName = cat.name.toLowerCase();
                if (categoriasValidas.some(v => catName.includes(v))) {
                  esCategoriaValida = true;
                  break;
                }
              }
            }

            // Si no se encontró el arreglo de categorías, o si no hace match con el rubro, ignorar
            if (!esCategoriaValida && p.categories && p.categories.length > 0) {
              continue;
            }

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
              nuevosProductos++;
            }
          }

          console.log(`[Sodimac] Página ${pagina}: procesados ${rawProducts.length} productos, agregados ${nuevosProductos} válidos. Total: ${items.length}`);

          if (items.length >= maxProductos) break;

          if (nuevosProductos === 0) {
            console.log(`[Sodimac] No se agregaron nuevos productos en la página ${pagina}, deteniendo paginación.`);
            break;
          }

          pagina++;
        } catch (pageError) {
          console.error(`[Sodimac] Error al procesar página ${pagina}:`, pageError.message);
          break; // Detener la paginación pero conservar los productos ya extraídos
        }
      }

      console.log(`[Sodimac] Extracción completa: ${items.length} productos válidos.`);
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
          const imagen = p.mediaUrls && p.mediaUrls.length > 0 ? p.mediaUrls[0] : '';
          return [{
            nombre: p.displayName,
            marca: p.brand || '',
            link: url,
            precio: precio,
            imagen: imagen
          }];
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
