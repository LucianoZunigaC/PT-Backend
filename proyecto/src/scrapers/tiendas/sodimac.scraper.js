import { BaseScraper } from '../base.scraper.js';

export class SodimacScraper extends BaseScraper {
  constructor() {
    super('Sodimac', 'https://sodimac.falabella.com/sodimac-cl');
  }

  // Método de Búsqueda (PLP)
  async scrape(terminoBusqueda, maxProductos = 20) {
    try {
      await this.init();
      console.log(`[Sodimac] Buscando: "${terminoBusqueda}" (max ${maxProductos} productos)`);
      
      const todosLosProductos = [];
      let pagina = 1;

      while (todosLosProductos.length < maxProductos) {
        const url = pagina === 1
          ? `${this.baseUrl}/search?Ntt=${encodeURIComponent(terminoBusqueda)}`
          : `${this.baseUrl}/search?Ntt=${encodeURIComponent(terminoBusqueda)}&start=${(pagina - 1) * 40}`;

        console.log(`[Sodimac] Página ${pagina}: ${url.substring(0, 70)}...`);
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(4000);

        const productosPagina = await this.page.evaluate(() => {
          const items = [];
          // Las tarjetas tienen la clase "grid-pod"
          const cards = document.querySelectorAll('[class*="grid-pod"]');
          
          cards.forEach(card => {
            // El link de producto va a falabella.com/product/...
            const aTag = Array.from(card.querySelectorAll('a'))
              .find(a => a.href && a.href.includes('/product/'));
            
            if (!aTag) return;
            
          // Marca: span de marca que aparece sobre el título
            const marcaEl = card.querySelector('[class*="brand"], [class*="Brand"], p[class*="brand"]');
            const marca = marcaEl ? marcaEl.innerText.trim() : '';

            // Nombre: concatenar marca + nombre si la marca está separada del título
            const tituloTexto = aTag.innerText.trim();
            // El innerText del link puede contener varias líneas, tomamos la que no sea la marca ni precio
            const lineas = tituloTexto.split('\n').map(l => l.trim()).filter(l => l.length > 2);
            // La línea que contiene $ es el precio, la ignoramos, junto con texto de vendedor/mayorista
            const RUIDO = ['$', 'sodimac', 'mayorista', 'retira', 'llega', 'por ', 'precio sobre'];
            const nombreLineas = lineas.filter(l => !RUIDO.some(r => l.toLowerCase().includes(r)) && !l.match(/^\(\d+\)$/));
            // Limpiar texto residual "PRECIO sobre X un" que puede quedar embebido
            const nombreSinRuido = nombreLineas.join(' ').replace(/PRECIO\s+sobre\s+\d+\s+un/gi, '').trim();
            
            let nombre = nombreSinRuido;
            // Si el nombre es solo la marca (corto y en mayúsculas), combinamos con el texto del h3 si existe
            const h3 = card.querySelector('h3, b, strong');
            if (nombre.length < 4 || nombre === nombre.toUpperCase() && nombre.length < 15) {
              const h3Text = h3 ? h3.innerText.trim() : '';
              if (h3Text && !nombre.includes(h3Text)) {
                nombre = (nombre + ' ' + h3Text).trim();
              }
            }
            const link = aTag.href;

            // Precio: elemento con $ y longitud corta
            const priceEls = Array.from(card.querySelectorAll('*'))
              .filter(el => el.children.length === 0 && el.innerText && 
                            el.innerText.includes('$') && el.innerText.length < 12);
            
            let precio = 0;
            for (const p of priceEls) {
              const text = p.innerText.replace(/[^0-9]/g, '');
              if (text.length >= 3) {
                precio = parseInt(text);
                break;
              }
            }

            if (nombre && precio > 0) {
              items.push({ nombre, marca, link, precio });
            }
          });
          
          return items;
        });

        if (productosPagina.length === 0) break;

        todosLosProductos.push(...productosPagina);
        console.log(`[Sodimac] Página ${pagina}: ${productosPagina.length} productos. Total: ${todosLosProductos.length}`);

        if (todosLosProductos.length >= maxProductos) break;
        pagina++;
      }

      const resultado = todosLosProductos.slice(0, maxProductos);
      console.log(`[Sodimac] Extracción completa: ${resultado.length} productos.`);
      return resultado;

    } catch (error) {
      console.error(`[Sodimac] Error durante la búsqueda:`, error.message);
      return [];
    } finally {
      await this.close();
    }
  }

  // Método de URL Directa (PDP)
  async scrapeUrl(url) {
    try {
      await this.init();
      console.log(`[Sodimac] Visitando producto: ${url.substring(0, 50)}...`);
      
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(4000);
      
      const producto = await this.page.evaluate(() => {
        let nombre = 'Sin nombre';
        const h1 = document.querySelector('h1');
        if (h1) nombre = h1.innerText.trim();

        let precio = 0;
        const priceEls = Array.from(document.querySelectorAll('*'))
          .filter(el => el.children.length === 0 && el.innerText && 
                        el.innerText.includes('$') && el.innerText.length < 12);
        for (const el of priceEls) {
          const text = el.innerText.replace(/[^0-9]/g, '');
          if (text.length >= 3) {
            precio = parseInt(text);
            break;
          }
        }

        return { nombre, link: window.location.href, precio };
      });

      console.log(`[Sodimac] Extraído: ${producto.nombre} - $${producto.precio}`);
      return producto.precio > 0 ? [producto] : [];

    } catch (error) {
      console.error(`[Sodimac] Error durante el scraping:`, error.message);
      return [];
    } finally {
      await this.close();
    }
  }
}
