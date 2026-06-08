import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
chromium.use(stealth());

async function testSite(name, url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log(`\n[${name}] Probando ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    
    const result = await page.evaluate(() => {
      const productTexts = Array.from(document.querySelectorAll('*'))
        .filter(el => el.children.length === 0 && el.innerText && 
                el.innerText.toLowerCase().includes('cemento') && 
                el.innerText.length < 80)
        .map(el => ({ tag: el.tagName, text: el.innerText.trim(), class: el.className.substring(0,40) }));
      
      const prices = Array.from(document.querySelectorAll('*'))
        .filter(el => el.children.length === 0 && el.innerText && 
                el.innerText.includes('$') && el.innerText.length < 15)
        .map(el => el.innerText.trim());
      
      return { 
        title: document.title, 
        url: window.location.href,
        productTexts: productTexts.slice(0, 5),
        prices: prices.slice(0, 5)
      };
    });
    
    console.log('Título:', result.title);
    console.log('URL final:', result.url);
    console.log('Textos con cemento:', result.productTexts.length);
    console.log('Precios:', result.prices);
    if (result.productTexts.length > 0) console.log('Ejemplo:', result.productTexts[0]);
    
  } catch(e) {
    console.log(`Error: ${e.message.substring(0,80)}`);
  } finally {
    await browser.close();
  }
}

(async () => {
  await testSite('Tecnofast', 'https://www.tecnofast.cl/Search?q=cemento');
  await testSite('Ferreteria', 'https://www.ferreteria.cl/buscar?q=cemento');
  await testSite('Sodimac API', 'https://sodimac.falabella.com/sodimac-cl/search?Ntt=cemento');
})();
