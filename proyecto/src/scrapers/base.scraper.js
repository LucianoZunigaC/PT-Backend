import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

chromium.use(stealth());

export class BaseScraper {
  constructor(proveedorNombre, baseUrl) {
    this.proveedorNombre = proveedorNombre;
    this.baseUrl = baseUrl;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async init() {
    console.log(`[${this.proveedorNombre}] Inicializando scraper...`);
    this.browser = await chromium.launch({
      headless: false, // En false para poder ver qué hace durante el desarrollo
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    this.page = await this.context.newPage();
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log(`[${this.proveedorNombre}] Navegador cerrado.`);
    }
  }

  async esperarSegundos(segs) {
    return new Promise(resolve => setTimeout(resolve, segs * 1000));
  }

  // Método abstracto a implementar en cada tienda
  async scrapeUrl(url) {
    throw new Error('Método scrapeUrl() debe ser implementado por la clase hija');
  }
}
