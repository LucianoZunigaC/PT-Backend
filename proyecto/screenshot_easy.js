import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  console.log('Navegando a easy.cl/cemento ...');
  await page.goto('https://www.easy.cl/cemento', { waitUntil: 'domcontentloaded' });
  
  console.log('Esperando 5 segundos...');
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: 'easy_screenshot.png', fullPage: true });
  console.log('Captura guardada en easy_screenshot.png');
  
  await browser.close();
}

main().catch(console.error);
