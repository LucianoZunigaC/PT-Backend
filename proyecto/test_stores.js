import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
chromium.use(stealth());

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  
  try {
    const page = await context.newPage();
    
    // Probar Construmart
    console.log('[Construmart] Probando...');
    await page.goto('https://www.construmart.cl/cemento?_q=cemento&map=ft', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const titleConstrumart = await page.title();
    console.log('Construmart Title:', titleConstrumart);
    const htmlConstrumart = await page.content();
    console.log('Construmart HTML tiene cemento?', htmlConstrumart.toLowerCase().includes('cemento'));
    
    // Probar Imperial
    console.log('[Imperial] Probando...');
    await page.goto('https://www.imperial.cl/busqueda?q=cemento', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const titleImperial = await page.title();
    console.log('Imperial Title:', titleImperial);
    const htmlImperial = await page.content();
    console.log('Imperial HTML tiene cemento?', htmlImperial.toLowerCase().includes('cemento'));

  } catch(e) {
    console.log('Error:', e);
  }

  await browser.close();
})();
