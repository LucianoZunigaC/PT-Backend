import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
chromium.use(stealth());

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  try {
    const page = await context.newPage();
    
    // Easy PDP
    console.log('[Easy] Visitando producto...');
    await page.goto('https://www.easy.cl/martillo-carpintero-450-gr-robust-1277696/p?skuId=57608', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const titleEasy = await page.title();
    console.log('Easy Title:', titleEasy);
    const easyPrice = await page.evaluate(() => {
        // Try to find any element with $
        const elements = Array.from(document.querySelectorAll('span, div')).filter(el => el.innerText && el.innerText.includes('$') && el.innerText.length < 15);
        return elements.map(e => e.innerText);
    });
    console.log('Easy possible prices:', easyPrice.slice(0, 5));

    // Sodimac PDP
    console.log('[Sodimac] Visitando producto...');
    await page.goto('https://www.falabella.com/falabella-cl/product/110309884/cemento-polpaico-25-kilos/110309919?exp=sodimac', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const titleSodimac = await page.title();
    console.log('Sodimac Title:', titleSodimac);
    const sodimacPrice = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('span, div')).filter(el => el.innerText && el.innerText.includes('$') && el.innerText.length < 15);
        return elements.map(e => e.innerText);
    });
    console.log('Sodimac possible prices:', sodimacPrice.slice(0, 5));
    
  } catch(e) {
    console.log('Error:', e);
  }

  await browser.close();
})();
