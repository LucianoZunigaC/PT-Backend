import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
chromium.use(stealth());

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  try {
    const page = await context.newPage();
    
    console.log('[Imperial] Visitando busqueda...');
    await page.goto('https://www.imperial.cl/search?Ntt=cemento&searchType=simple', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    const elements = await page.evaluate(() => {
        const els = document.querySelectorAll('*');
        const counts = {};
        els.forEach(el => {
            if (el.className && typeof el.className === 'string') {
                const classes = el.className.split(' ');
                classes.forEach(c => {
                    if (c) counts[c] = (counts[c] || 0) + 1;
                });
            }
        });
        
        // Find text containing Cemento
        const textNodes = Array.from(document.querySelectorAll('*')).filter(e => e.innerText && e.innerText.toLowerCase().includes('cemento') && e.children.length === 0);
        return {
            classes: Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 30),
            cementoTexts: textNodes.map(e => ({ text: e.innerText, class: e.className, tag: e.tagName }))
        };
    });
    console.log(JSON.stringify(elements.cementoTexts.slice(0, 10), null, 2));
    
  } catch(e) {
    console.log('Error:', e);
  }

  await browser.close();
})();
