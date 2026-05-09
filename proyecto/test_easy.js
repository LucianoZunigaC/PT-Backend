import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false }); // Headless = false to let the browser execute more normally
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  });
  
  try {
    const page = await context.newPage();
    console.log('[Easy] Navegando al home...');
    await page.goto('https://www.easy.cl', { waitUntil: 'domcontentloaded' });
    
    console.log('[Easy] Buscando cemento...');
    // Type in search bar
    await page.waitForSelector('input[placeholder*="Buscar"]', { timeout: 15000 });
    await page.fill('input[placeholder*="Buscar"]', 'cemento');
    await page.press('input[placeholder*="Buscar"]', 'Enter');
    
    // Wait for URL change or results
    await page.waitForTimeout(5000);
    
    console.log('[Easy] Extrayendo...');
    const url = page.url();
    console.log('[Easy] URL actual:', url);

    const html = await page.content();
    if (html.includes('cemento')) {
      console.log('[Easy] Cemento encontrado en la página!');
    }
  } catch(e) {
    console.log('Error Easy:', e);
  }

  await browser.close();
})();
