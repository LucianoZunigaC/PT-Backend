import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
chromium.use(stealth());

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  try {
    const page = await context.newPage();
    
    await page.goto('https://www.imperial.cl/search?Ntt=cemento&searchType=simple&Nrpp=36', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    
    const data = await page.evaluate(() => {
      // Analizar el h2 del Cemento Polpaico específicamente
      const h2s = Array.from(document.querySelectorAll('h2')).filter(h => h.innerText && h.innerText.includes('Cemento Polpaico'));
      
      if (h2s.length === 0) return { error: 'No se encontró el h2', allH2: Array.from(document.querySelectorAll('h2')).map(h => h.innerText) };
      
      const h2 = h2s[0];
      const parent = h2.parentElement;
      const grandparent = parent?.parentElement;
      const greatgrandparent = grandparent?.parentElement;
      
      return {
        h2Text: h2.innerText,
        parentTag: parent?.tagName,
        parentClass: parent?.className,
        parentHTML: parent?.innerHTML?.substring(0, 500),
        grandparentTag: grandparent?.tagName,
        grandparentClass: grandparent?.className,
        grandparentHTML: grandparent?.innerHTML?.substring(0, 500),
        aTagFromH2: h2.closest('a')?.href,
        aTagFromParent: parent?.querySelector('a')?.href,
        allPricesInParent: Array.from(parent?.querySelectorAll('*') || [])
          .filter(el => el.innerText && el.innerText.includes('$') && el.children.length === 0)
          .map(el => ({ tag: el.tagName, text: el.innerText, class: el.className }))
      };
    });
    
    console.log(JSON.stringify(data, null, 2));
    
  } catch(e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
})();
