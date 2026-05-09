import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
chromium.use(stealth());

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  try {
    const page = await context.newPage();
    
    await page.goto('https://www.construmart.cl/materiales-de-construccion/aglomerantes-y-accesorios/cementos', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    
    const info = await page.evaluate(() => {
      // Buscar el elemento con "Cemento Especial Bolsa 1 kg" y explorar su entorno
      const productLink = document.querySelector('a.product-item-link');
      if (!productLink) return { error: 'No se encontró a.product-item-link' };
      
      const li = productLink.closest('li');
      return {
        liFound: !!li,
        liClass: li?.className,
        allTexts: li ? Array.from(li.querySelectorAll('*'))
          .filter(e => e.children.length === 0 && e.innerText && e.innerText.trim())
          .map(e => ({ tag: e.tagName, class: e.className, text: e.innerText.substring(0, 50) })) : []
      };
    });
    
    console.log(JSON.stringify(info, null, 2));
    
  } catch(e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
})();
