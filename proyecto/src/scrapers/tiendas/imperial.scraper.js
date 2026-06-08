import { BaseScraper } from '../base.scraper.js';

export class ImperialScraper extends BaseScraper {
  constructor() {
    super('Imperial', 'https://www.imperial.cl');
  }

  // Método de Búsqueda (PLP)
  async scrape(terminoBusqueda, maxProductos = 20) {
    try {
      await this.init();
      console.log(`[Imperial] Buscando: "${terminoBusqueda}" (max ${maxProductos} productos)`);

      const todosLosProductos = [];
      let pagina = 1;
      const porPagina = 36; // Imperial Nrpp=36

      while (todosLosProductos.length < maxProductos) {
        try {
          const offset = (pagina - 1) * porPagina;
          const url = `${this.baseUrl}/search?Ntt=${encodeURIComponent(terminoBusqueda)}&searchType=simple&Nrpp=${porPagina}&No=${offset}`;
          console.log(`[Imperial] Página ${pagina}: ${url}`);

          await this.page.goto(url, { waitUntil: 'domcontentloaded' });

          // Esperar específicamente a que rendericen los h2 de productos
          console.log(`[Imperial] Esperando renderizado dinámico de productos...`);
          await this.page.waitForSelector('h2', { timeout: 12000 }).catch(() => {
            console.log(`[Imperial] Los h2 no aparecieron después de 12s.`);
          });

          const productosPagina = await this.page.evaluate(() => {
            const items = [];
            const titles = document.querySelectorAll('h2');

            titles.forEach((titleEl) => {
              if (!titleEl.innerText || titleEl.innerText.length < 5) return;

              // El h2 está dentro de un <a>, ese <a> está dentro del div tarjeta
              const aTag = titleEl.closest('a');
              if (!aTag) return;

              // El contenedor real de la tarjeta es el parentElement del <a>
              const container = aTag.parentElement;
              if (!container) return;

              const nombre = titleEl.innerText.trim();
              // La marca está en un <small> dentro del contenedor (encima del h2)
              const marcaEl = container.querySelector('small, [class*="brand"], [class*="Brand"]');
              const marca = marcaEl ? marcaEl.innerText.trim() : '';
              // El href viene relativo, construir URL absoluta
              const href = aTag.getAttribute('href') || '';
              const link = href.startsWith('http') ? href : `https://www.imperial.cl/${href.replace(/^\//, '')}`;

              // Buscar precios en el contenedor de la tarjeta
              // Saltar precios unitarios (por KG, por m2, etc.)
              let precio = 0;
              const priceEls = container.querySelectorAll('p, span');
              for (const p of priceEls) {
                if (!p.innerText || !p.innerText.includes('$')) continue;
                if (p.innerText.toLowerCase().includes(' por ')) continue;
                const text = p.innerText.replace(/[^0-9]/g, '');
                if (text.length >= 3) {
                  precio = parseInt(text);
                  break;
                }
              }

              // Imagen
              const imgEl = container.querySelector('img');
              let src = imgEl ? (imgEl.getAttribute('src') || imgEl.src || '') : '';
              const imagen = src.startsWith('http') ? src : (src ? `https://www.imperial.cl${src.startsWith('/') ? '' : '/'}${src}` : '');

              if (precio > 0) {
                items.push({ nombre, marca, link, precio, imagen });
              }
            });

            return items;
          });

          if (productosPagina.length === 0) {
            console.log(`[Imperial] No se encontraron más productos en la página ${pagina}.`);
            break;
          }

          todosLosProductos.push(...productosPagina);
          console.log(`[Imperial] Página ${pagina}: ${productosPagina.length} productos. Total acumulado: ${todosLosProductos.length}`);

          if (todosLosProductos.length >= maxProductos) break;
          pagina++;
        } catch (pageError) {
          console.error(`[Imperial] Error al procesar página ${pagina}:`, pageError.message);
          break; // Detener la paginación pero conservar los productos ya extraídos
        }
      }

      const resultado = todosLosProductos.slice(0, maxProductos);
      console.log(`[Imperial] Extracción completa: ${resultado.length} productos.`);
      return resultado;

    } catch (error) {
      console.error(`[Imperial] Error durante la búsqueda:`, error.message);
      return [];
    } finally {
      await this.close();
    }
  }

  // Método de URL Directa (PDP)
  async scrapeUrl(url) {
    try {
      await this.init();
      console.log(`[Imperial] Visitando producto: ${url.substring(0, 50)}...`);

      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(4000);

      const producto = await this.page.evaluate(() => {
        let nombre = '';
        let marca = '';
        let imagen = '';
        try {
          const products = window.state?.catalogRepository?.products;
          if (products) {
            const prodKey = Object.keys(products)[0];
            const pData = products[prodKey];
            if (pData) {
              if (pData.displayName) nombre = pData.displayName;
              if (pData.brand) marca = pData.brand;
              if (pData.primaryFullImageURL) imagen = pData.primaryFullImageURL;
              if (!imagen && pData.primaryLargeImageURL) imagen = pData.primaryLargeImageURL;
            }
          }
        } catch (e) {}

        // Fallback DOM para Nombre
        if (!nombre) {
          const h1 = document.querySelector('h1');
          if (h1) nombre = h1.innerText.trim();
        }
        if (!nombre) nombre = 'Sin nombre';

        // Fallback DOM para Marca
        if (!marca) {
          const brandEl = document.querySelector('.brand, [class*="brand"], [class*="Brand"], .product-brand');
          if (brandEl) marca = brandEl.innerText.trim();
        }

        // Fallback DOM para Imagen
        if (!imagen) {
          const imgEl = document.querySelector('.product-image img, img.primary-image, [class*="product-image"] img, img');
          if (imgEl) {
            imagen = imgEl.src || imgEl.getAttribute('src') || '';
          }
        }
        if (imagen && !imagen.startsWith('http')) {
          imagen = 'https://www.imperial.cl' + (imagen.startsWith('/') ? '' : '/') + imagen;
        }

        const elements = Array.from(document.querySelectorAll('span, div, p')).filter(el => el.innerText && el.innerText.includes('$') && el.innerText.length < 15);

        let precio = 0;
        for (const el of elements) {
          const text = el.innerText.replace(/[^0-9]/g, '');
          if (text.length >= 3) {
            precio = parseInt(text);
            break;
          }
        }

        return { nombre, marca, link: window.location.href, precio, imagen };
      });

      console.log(`[Imperial] Extraído: ${producto.nombre} - $${producto.precio}`);

      return producto.precio > 0 ? [producto] : [];

    } catch (error) {
      console.error(`[Imperial] Error durante el scraping:`, error.message);
      return [];
    } finally {
      await this.close();
    }
  }
}
