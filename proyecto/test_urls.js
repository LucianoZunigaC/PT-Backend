import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  
  try {
    const page = await context.newPage();
    console.log('[Easy] Navegando directo...');
    await page.goto('https://www.easy.cl/search?_q=cemento', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const easyTitle = await page.title();
    console.log('Easy Title:', easyTitle);
    
    console.log('[Sodimac] Navegando directo...');
    await page.goto('https://sodimac.falabella.com/sodimac-cl/search?Ntt=cemento', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const sodimacTitle = await page.title();
    console.log('Sodimac Title:', sodimacTitle);
    
    // Evaluate and print some classes
    const sodimacClasses = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('div[class*="pod"]')).slice(0, 3).map(el => el.className);
    });
    console.log('Sodimac pod classes:', sodimacClasses);

  } catch(e) {
    console.log('Error:', e);
  }

  await browser.close();
})();
