import * as cheerio from 'cheerio';
import fs from 'fs/promises';

async function main() {
  const html = await fs.readFile('easy_dump.html', 'utf-8');
  const $ = cheerio.load(html);
  
  console.log('--- Buscando productos en Easy ---');
  
  // Try to find product cards based on common VTEX IO classes
  const possibleCards = $('section.vtex-product-summary-2-x-container, div[class*="product-summary"], article');
  console.log(`Posibles tarjetas encontradas: ${possibleCards.length}`);
  
  let count = 0;
  possibleCards.each((i, el) => {
    if (count >= 5) return;
    const text = $(el).text();
    // Only print elements that seem to have a price
    if (text.includes('$')) {
      console.log(`\n--- Tarjeta ${i} ---`);
      
      // Attempt to find link
      const link = $(el).find('a').first().attr('href');
      console.log(`Link: ${link}`);
      
      // Attempt to find image
      const img = $(el).find('img').first().attr('src');
      console.log(`Image: ${img}`);
      
      // Attempt to find price
      const priceHtml = $(el).find('[class*="price"], [class*="currency"]').first().html();
      console.log(`Price HTML: ${priceHtml}`);
      
      // All text to find name
      console.log(`Texto: ${text.substring(0, 150).replace(/\n/g, ' ')}...`);
      count++;
    }
  });
}

main().catch(console.error);
