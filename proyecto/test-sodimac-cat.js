import { chromium } from 'playwright-extra';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://sodimac.falabella.com/sodimac-cl/search?Ntt=caterpillar');
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
        prods.slice(0,5).forEach(p => {
            console.log("Name:", p.displayName);
            if (p.categories) {
                console.log("Categories:", p.categories);
            } else {
                console.log("No categories field found");
            }
            console.log("----");
        });
    }
    await browser.close();
}
run();
