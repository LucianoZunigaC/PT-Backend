import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  
  try {
    const page = await context.newPage();
    
    console.log('[Sodimac] Navegando directo...');
    await page.goto('https://sodimac.falabella.com/sodimac-cl/search?Ntt=cemento', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    const sodimacData = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="product"]')).map(a => {
        return { href: a.href, text: a.innerText };
      }).filter(i => i.text.length > 5);
    });
    console.log('Sodimac products:', sodimacData.slice(0, 3));

  } catch(e) {
    console.log('Error:', e);
  }

  await browser.close();
})();
