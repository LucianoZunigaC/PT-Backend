## 1. Implementación de Paginación en Scrapers
Se completó el soporte de paginación para realizar búsquedas multi-página hasta cubrir el número de productos solicitado (`maxProductos`).

- **Lógica de Paginación**:
  - **Sodimac** (`src/scrapers/tiendas/sodimac.scraper.js`): Se añadió el parámetro `&page=${pagina}` en la URL de búsqueda y un ciclo `while` para paginar de forma dinámica.
  - **MercadoLibre** (`src/scrapers/tiendas/mercadolibre.scraper.js`): Se calculó el offset de paginación usando `_Desde_${offset + 1}` para navegar secuencialmente de 48 en 48 artículos.
  - **Imperial** (`src/scrapers/tiendas/imperial.scraper.js`): Se implementó la paginación con el parámetro de offset `&No=${offset}` e incremento de página en base a 36 productos por página.
  - **Construmart** (`src/scrapers/tiendas/construmart.scraper.js`): Se implementó el parámetro de paginación `&p=${pagina}` nativo de Magento.

---

## 2. Manejo de Excepciones
Se robusteció el flujo de ejecución de los scrapers para asegurar tolerancia a fallos parciales durante las descargas masivas o ejecuciones concurrentes.

- **Tolerancia a fallos por página**: Se envolvieron los bloques de navegación de cada página en bloques `try...catch` independientes. Si una página del catálogo falla por timeout, bloqueos de red o problemas de parseo del DOM, el scraper no se interrumpe; captura el error, detiene la paginación de manera controlada y retorna todos los productos que ya habían sido extraídos de páginas previas con éxito.
- **Manejo de Cierre de Recursos**: Se implementaron cláusulas `finally` seguras para garantizar el cierre definitivo del navegador (`await this.close()` / `browser.close()`) liberando la memoria del servidor incluso si ocurre una excepción fatal en la mitad del proceso.

## 3. Unificación de Salida de Datos (Scrapers)
Se aseguró que todos los scrapers de la plataforma retornen una estructura homogénea tanto en búsquedas generales (`scrape`) como en visitas a URLs directas (`scrapeUrl`). 

**Estructura unificada:**
`[{ nombre, marca, link, precio, imagen }]`

- **Sodimac** (`src/scrapers/tiendas/sodimac.scraper.js`): Se modificó `scrapeUrl` para capturar la marca (`p.brand`) y la imagen (`p.mediaUrls[0]`) del JSON interno de la página y retornarlos en la salida.
- **Imperial** (`src/scrapers/tiendas/imperial.scraper.js`): Se corrigió `scrapeUrl` para evitar el título `"Sin nombre"`. Ahora extrae directamente el nombre (`pData.displayName`), marca (`pData.brand`) e imagen (`pData.primaryFullImageURL`) del state de Oracle Commerce Cloud (`window.state`) con selectores DOM tradicionales de respaldo.
- **MercadoLibre** (`src/scrapers/tiendas/mercadolibre.scraper.js`): Se homogeneizó `scrapeUrl` abstrayendo la marca desde tablas de especificaciones o enlaces, e imágenes de alta resolución.
- **Construmart** (`src/scrapers/tiendas/construmart.scraper.js`): Se implementó completamente `scrapeUrl` para poblar todos los campos estándar.
- **runner.js**: Se corrigieron las URLs de pruebas obsoletas (que daban error 404 en Imperial) por URLs de productos vigentes.

---

## 4. Script de Limpieza en Normalización
Se resolvió la redundancia de los scripts de limpieza que antes estaban divididos y cableados (hardcoded).

- **Unificación**: Se reescribió `cleanBasura.js` para utilizar la validación global de exclusión `esProductoValido` expuesta en `normalization.service.js`. Cualquier término prohibido (ej: *lego, barbie, smart tv, juguete*) se filtra dinámicamente.
- **Integridad Referencial**: Se implementó borrado seguro en cascada. El script elimina primero los registros vinculados en las tablas `Precio` y `Redireccion` antes de borrar el `Producto` para evitar excepciones de clave foránea en PostgreSQL.
- **Limpieza de código**: Se eliminó definitivamente el script obsoleto `cleanLego.js` y se añadió `"clean:basura": "node src/scripts/cleanBasura.js"` en `package.json` para facilitar la ejecución.

---

## 5. Homologación de Unidades
Se corrigió la pérdida de dimensiones en la limpieza de caracteres especiales.

- **Preservación de Decimales**: Se modificó la limpieza del texto en `normalizarProducto` para conservar los puntos (`.`) y convertir comas (`,`) a puntos decimales siempre que estén rodeados por números (ej: `22,5` -> `22.5`).
- **Preservación de Fracciones**: Se agregaron excepciones para mantener la barra diagonal (`/`) cuando divide números (ej: `1/2` o `3/4` de pulgada), evitando que se convirtieran en números pegados como `12` o `34`.
- **Mapeo de Comillas para Pulgadas**: Se convirtió la comilla doble `"` (usada para pulgadas, ej: `3"`) a la palabra estándar `pulg` antes de procesarla.
- **Nuevas Unidades Homologadas** (`UNIDADES_MAP`):
  - Longitud y Volumen: `mt` -> `m`, `pul`/`plg` -> `pulg`, `galon`/`galones` -> `gal`.
  - Eléctricas: `watts`/`watt`/`wats` -> `w`, `volts`/`voltios`/`voltio` -> `v`, `amperes`/`amp` -> `a`.

---

## 6. Lógica de Deduplicación
Se robusteció el motor de emparejamiento para prevenir la agrupación incorrecta de productos con distintas dimensiones o de distintas marcas (falsos positivos).

- **Estandarización de Multiplicación**: Se añadió una regla en `normalizarProducto` para transformar formatos de dimensiones compactas (ej: `2x4` o `1.2x2.4`) en su equivalente con espacios (`2 x 4`, `1.2 x 2.4`), garantizando tokens de medidas consistentes.
- **Validación Estricta Numérica (`tienenMismosNumeros`)**: Se añadieron las funciones `extraerNumeros` y `tienenMismosNumeros` en `normalization.service.js`. Ahora, el validador extrae todas las cantidades numéricas de los tokens y rechaza de inmediato el match si no coinciden exactamente (ej: tornillo de `1 pulg` vs `2 pulg`).
- **Validación Cruzada de Marcas**: En `guardarResultadosScraping` (`scraping.service.js`), si tanto el producto extraído como el candidato de base de datos tienen marcas, se normalizan y contrastan. Si difieren (ej: cemento `Melón` vs `Polpaico`), se omite la coincidencia.
- **Optimización de Umbral**: Gracias a las salvaguardas anteriores, el umbral de Jaccard se redujo de manera segura a `0.55` para tolerar variaciones descriptivas (ej: "Cemento Polpaico especial saco 25kg" vs "Cemento Polpaico bolsa de 25 kg").

---


