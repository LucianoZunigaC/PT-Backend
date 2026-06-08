import { ImperialScraper } from './src/scrapers/tiendas/imperial.scraper.js';
import fs from 'fs';

async function test() {
    const scraper = new ImperialScraper();
    await scraper.init();
    await scraper.page.goto('https://www.imperial.cl/search?Ntt=pintura&searchType=simple&Nrpp=36', { waitUntil: 'networkidle' });
    const html = await scraper.page.content();
    fs.writeFileSync('imperial.html', html);
    await scraper.close();
    console.log("HTML guardado");
}
test();
