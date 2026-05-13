import { BaseScraper } from '../base.scraper.js';

export class ImperialScraper extends BaseScraper {
  constructor() {
    super('Imperial', 'https://www.imperial.cl');
  }

  // Método de Búsqueda (PLP)
  async scrape(terminoBusqueda) {
    try {
      await this.init();
      console.log(`[Imperial] Buscando término: ${terminoBusqueda}`);
      
      // Nrpp=36 para obtener 36 resultados por página en lugar de los 12 por defecto
      const url = `${this.baseUrl}/search?Ntt=${encodeURIComponent(terminoBusqueda)}&searchType=simple&Nrpp=36`;
      await this.page.goto(url, { waitUntil: 'networkidle' });
      
      // Esperar específicamente a que rendericen los h2 de productos
      console.log(`[Imperial] Esperando renderizado dinámico de productos...`);
      await this.page.waitForSelector('h2', { timeout: 12000 }).catch(() => {
          console.log(`[Imperial] Los h2 no aparecieron después de 12s.`);
      });

      console.log(`[Imperial] Extrayendo resultados de búsqueda...`);
      const productos = await this.page.evaluate(() => {
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

      console.log(`[Imperial] ${productos.length} productos encontrados y extraídos.`);
      return productos;

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
        let nombre = 'Sin nombre';
        const h1 = document.querySelector('h1');
        if (h1) nombre = h1.innerText.trim();

        const elements = Array.from(document.querySelectorAll('span, div, p')).filter(el => el.innerText && el.innerText.includes('$') && el.innerText.length < 15);
        
        let precio = 0;
        for (const el of elements) {
            const text = el.innerText.replace(/[^0-9]/g, '');
            if (text.length >= 3) {
                precio = parseInt(text);
                break; 
            }
        }

        return { nombre, link: window.location.href, precio };
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
