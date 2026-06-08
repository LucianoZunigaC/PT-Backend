import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  console.log('Iniciando dump de Sodimac y Easy...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    console.log('Navegando a Sodimac...');
    await page.goto('https://sodimac.falabella.com/sodimac-cl/search?Ntt=cemento', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000); // Wait for dynamic content
    const htmlSodimac = await page.content();
    fs.writeFileSync('sodimac_dump.html', htmlSodimac);
    console.log('Dump Sodimac guardado.');
  } catch(e) {
    console.log('Error Sodimac:', e);
  }

  try {
    console.log('Navegando a Easy...');
    await page.goto('https://www.easy.cl/cemento?_q=cemento&map=ft', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const htmlEasy = await page.content();
    fs.writeFileSync('easy_dump.html', htmlEasy);
    console.log('Dump Easy guardado.');
  } catch(e) {
    console.log('Error Easy:', e);
  }

  await browser.close();
  console.log('Terminado.');
})();
