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
      headless: true, // Cambiado a true para ejecución en segundo plano
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });
    this.page = await this.context.newPage();
    
    // Aumentar tiempos de espera por defecto para conexiones lentas
    this.page.setDefaultNavigationTimeout(45000);
    this.page.setDefaultTimeout(45000);

    // Optimizar carga bloqueando recursos pesados e innecesarios
    await this.page.route('**/*', (route) => {
      const type = route.request().resourceType();
      const url = route.request().url();
      
      if (
        ['image', 'media', 'font', 'stylesheet'].includes(type) ||
        url.includes('google-analytics') ||
        url.includes('analytics') ||
        url.includes('doubleclick') ||
        url.includes('facebook') ||
        url.includes('hotjar') ||
        url.includes('sentry') ||
        url.includes('gtm') ||
        url.includes('googletagmanager') ||
        url.includes('adsystem') ||
        url.includes('optimizely')
      ) {
        route.abort().catch(() => {});
      } else {
        route.continue().catch(() => {});
      }
    });
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
