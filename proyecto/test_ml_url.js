import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
chromium.use(stealth());

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  try {
    const page = await context.newPage();
    const url = 'https://click1.mercadolibre.cl/mclics/clicks/external/MLC/count?a=RcZcyomk1iHxH44mQmNxxEykKQr8NuNlVBckEurFSJCIqLVxCxwFRgQnMnOzLJv2g0uoS9Ow5%2Fz4J%2FHgacnpEjeVPPo%2Fo3z%2FCAuU4aHXoDTY8zKTAcrTggqPS%2FTSLxgBwRhB2K7nnrdRNAxGI1PdqBYwV3dpkfaOSRun%2FZ9YIxu8SbQDR14%2FFmhs96CF18XN6TSbIPrn%2FWmSgxE5ixlzfXML1yzVtJyKE9lW7RV9B4SoJlgkN6nqJjQLIezSmOdG1UBOO%2Fgi741bj7S81svLDHiyrAWzAvEJE9VzbapJxyIPpN3gBA3kF7DJMIsxvlGhFFU7NrsBJytTTLXOHdrQdW2TAIdHG2O0XX03PJmO4e5vPltPLPCodMg%2Fw6pmkJbkC5W3hOHkm8l291i3NpIN2a%2FTFMFHKVRrdbEByooaNhRW50uDphcVmKlDyGygkGBmN23i%2Bbn6HG8PJsWrEtvKbcqkH7eZEHi7RUfNXwkp7QHKUQS5WerkoaCfN19iR2nHhZQqGHTSvzl0WthjcRE2YrS7csxWNl%2FI4s4umBeMdbI9PTVJY%2Fx%2FOZEYHS4XkVQiHE7Rl4IUhTRf7uyo%2BSVuOr9ogax11k0Ex2W48iBeJhN7S6N24GDHkn4W1nlaBGiRWuYUX%2F78UFFTygyw1ujSP6SNvx1WqgNRes1Ejg1K7bKq7zMYHd8mKMEnDcDNr99cEHAONpLqH2FtNrv80iq2IowYaEqXtdv4g8rIbnctannQcABBtTr%2BbIM66%2FKOy55amMpRoyAr%2BN4Pz64LxTUOSLnJnrRNjGJNZt4odNDbtPNQ%2BwiEOTfHcP7%2F0CCC%2BMkAb52LRqNLsw009hAXJUYc0IutW3kCpLgTvoshF%2Bdz4KnUqyWV3JvWSyIEo4Pce6UafxSrt2MidUz5WTM0xHLraI7LvdyZMBkHFwtWvi4N06MyDJft0e2CD6IDk7vmmRuFEuuhYr9dHO9HtchVivUrgKL5CGZZt9b%2Fh7PF%2BqMjiw%3D%3D&pdp_filters=item_id%3AMLC3523805292#polycard_client=search-desktop&is_advertising=true&searchVariation=MLC27092395&backend_model=search-backend&be_origin=backend&search_layout=grid&position=3&type=pad&tracking_id=15039bfb-7782-4cfe-b228-3c849cd8407b&wid=MLC3523805292&sid=search';
    
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    const data = await page.evaluate(() => {
        let title = document.querySelector('h1.ui-pdp-title');
        let price = document.querySelector('.ui-pdp-price__second-line .andes-money-amount__fraction');
        return {
            title: title ? title.innerText : null,
            priceHtml: price ? price.innerHTML : null,
            priceText: price ? price.innerText : null
        };
    });
    console.log(data);
    
  } catch(e) {
    console.log('Error:', e);
  }

  await browser.close();
})();
