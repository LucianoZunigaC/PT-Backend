import { chromium } from 'playwright-extra';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://listado.mercadolibre.cl/herramientas/caterpillar');
    await page.waitForTimeout(2000);
    const html = await page.content();
    // just check if we have poly-card
    const cards = await page.$$('.poly-card');
    console.log(`Herramientas/caterpillar found ${cards.length} cards`);
    
    await page.goto('https://listado.mercadolibre.cl/construccion/caterpillar');
    await page.waitForTimeout(2000);
    const cards2 = await page.$$('.poly-card');
    console.log(`Construccion/caterpillar found ${cards2.length} cards`);
    
    await browser.close();
}
run();
