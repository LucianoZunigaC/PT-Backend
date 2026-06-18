import { chromium } from 'playwright-extra';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const url = 'https://sodimac.falabella.com/sodimac-cl/category/cat2890001/Ferreteria?Ntt=caterpillar';
    await page.goto(url);
    await page.waitForTimeout(2000);
    const html = await page.content();
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
    if(nextDataMatch) {
        const jsonData = JSON.parse(nextDataMatch[1]);
        function findProducts(obj) {
            if (!obj) return [];
            if (Array.isArray(obj) && obj.length > 0 && obj[0].productId) return obj;
            if (typeof obj === 'object') {
              for (let k in obj) {
                const res = findProducts(obj[k]);
                if (res.length > 0) return res;
              }
            }
            return [];
        }
        const prods = findProducts(jsonData);
        console.log(`Found ${prods.length} products in Ferreteria for caterpillar`);
    } else {
        console.log("No JSON found");
    }
    await browser.close();
}
run();
