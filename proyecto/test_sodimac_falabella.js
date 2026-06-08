import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
chromium.use(stealth());

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('[Sodimac] Inspeccionando estructura de tarjetas...');
    await page.goto('https://sodimac.falabella.com/sodimac-cl/search?Ntt=cemento', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    
    const result = await page.evaluate(() => {
      // Encontrar el primer elemento con "cemento" que sea un link de producto
      const productLinks = Array.from(document.querySelectorAll('a'))
        .filter(a => a.innerText && a.innerText.toLowerCase().includes('cemento') && 
                     a.href && a.href.includes('product') && a.innerText.length < 100);
      
      if (productLinks.length === 0) return { error: 'No se encontraron links de productos' };
      
      const firstLink = productLinks[0];
      // Subir para encontrar el contenedor de la tarjeta
      let container = firstLink;
      for (let i = 0; i < 8; i++) {
        container = container.parentElement;
        if (!container) break;
        const priceEls = Array.from(container.querySelectorAll('*'))
          .filter(el => el.children.length === 0 && el.innerText && 
                        el.innerText.includes('$') && el.innerText.length < 15);
        if (priceEls.length > 0) {
          return {
            productName: firstLink.innerText.trim(),
            productLink: firstLink.href.substring(0, 80),
            containerClass: container.className.substring(0, 80),
            prices: priceEls.map(e => ({ text: e.innerText, class: e.className.substring(0, 60) })).slice(0, 5),
            levelsUp: i
          };
        }
      }
      
      return { 
        productLinks: productLinks.map(a => a.innerText.trim()).slice(0, 5),
        error: 'Precio no encontrado en el entorno'
      };
    });
    
    console.log(JSON.stringify(result, null, 2));
    
  } catch(e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
