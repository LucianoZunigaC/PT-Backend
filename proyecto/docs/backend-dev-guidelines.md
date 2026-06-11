# Guías de Desarrollo Backend (Developer Guidelines)

Bienvenido al Backend de la Plataforma de Precios. Sigue estas directrices para mantener un código limpio, seguro y mantenible.

## 1. Reglas Generales de Código
- **Idioma:** Nombres de variables y funciones en Inglés/Spanglish estándar (`const products`, `getStorePrices()`), pero los comentarios y documentación deben estar en Español.
- **Asincronía:** Siempre usar `async / await`. Evitar el uso crudo de `.then()` y callbacks para no generar "callback hell". Usa `Promise.allSettled` cuando se disparen scrapers en paralelo para evitar que el fallo de un scraper bote toda la request.
- **Manejo de Errores:** Todos los bloques asíncronos peligrosos (como el scraping web) deben estar envueltos en bloques `try...catch`. Los errores no manejados no deben crashear el servidor Node.

## 2. Desarrollo de Nuevos Scrapers (Adaptadores)
Si necesitas agregar una nueva tienda (por ejemplo, Easy):
1. **No toques el controlador:** Crea una nueva clase en `scrapers/easyScraper.js`.
2. **Interface implícita:** Tu nueva clase debe poseer un método estático o asíncrono llamado `scrape(query)` que reciba el string de búsqueda.
3. **Retorno estricto:** El método debe devolver un Array de Objetos con exactamente esta estructura:
   `{ nombre, precio, url, marca, categoria, tienda: 'Easy' }`
4. **Registrar:** Luego de crearlo, instáncialo y añádelo al array de ejecución en `services/scraping.service.js`.

## 3. Uso de Playwright
- **Recursos:** Playwright es intensivo en RAM. Siempre, SIEMPRE cierra el contexto y el navegador (`await browser.close()`) en un bloque `finally {}`. Si olvidas esto, el servidor colapsará por pérdida de memoria al poco tiempo (Memory Leak).
- **Stealth:** Configura User-Agents reales e inyecta *Stealth Plugins* si es necesario para saltar los captchas básicos. No hagas peticiones concurrentes brutas a una misma tienda.

## 4. Prisma y Base de Datos
- **Migraciones:** Si cambias el `schema.prisma`, debes correr `npx prisma migrate dev --name <nombre-descriptivo>`. Nunca alteres la DB PostgreSQL a mano mediante sentencias SQL, siempre a través de migraciones de Prisma.
- **Relaciones:** Las consultas (`prisma.producto.findMany`) deben usar `include: { historial_precios: true }` si requieren el detalle del precio histórico. Evita el problema N+1 queries.

## 5. Pruebas Locales (Testing)
- Usa `npm run dev` que inicia Nodemon para reiniciar el servidor con cada cambio de archivo.
- Antes de commitear, utiliza la herramienta Postman o cURL en tu terminal para probar que `/api/productos/busqueda` sigue funcionando.
