import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
chromium.use(stealth());

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  
  try {
    const page = await context.newPage();
    console.log('[MercadoLibre] Probando...');
    await page.goto('https://listado.mercadolibre.cl/cemento', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    
    const productos = await page.evaluate(() => {
      const items = [];
      const cards = document.querySelectorAll('.ui-search-result__wrapper');
      
      cards.forEach(el => {
        const titleEl = el.querySelector('h2.ui-search-item__title');
        const priceEl = el.querySelector('.andes-money-amount__fraction');
        const linkEl = el.querySelector('a.ui-search-link');
        
        if (titleEl && priceEl) {
          items.push({
            nombre: titleEl.innerText,
            precio: parseInt(priceEl.innerText.replace(/\\D/g, '')),
            link: linkEl ? linkEl.href : ''
          });
        }
      });
      return items;
    });
    console.log(`MercadoLibre extrajo ${productos.length} productos:`, productos.slice(0, 2));
    
  } catch(e) {
    console.log('Error:', e);
  }

  await browser.close();
})();
