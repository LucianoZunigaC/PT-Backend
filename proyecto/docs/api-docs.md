# Documentación de la API (Backend)

La API REST del backend de Plataforma de Precios provee puntos de acceso para la búsqueda unificada de productos a través de múltiples e-commerce.

## Endpoint Principal: Búsqueda de Productos

Este endpoint orquesta en tiempo real el scraping en múltiples tiendas, filtra los datos basura, los agrupa por similitud y retorna la estructura unificada.

**Endpoint:** `GET /api/productos/busqueda`

**Query Parameters:**
- `q` (string, Requerido): El término de búsqueda (Ej: `cemento`, `taladro bosch`, `varilla 12mm`).

**Respuestas:**

### Success Response (200 OK)
Retorna un array de los productos agrupados (matched).
```json
[
  {
    "id": "1",
    "nombre": "Cemento Polpaico Saco 25kg",
    "categoria": "Materiales de Obra",
    "marca": "Polpaico",
    "precios": [
      {
        "tienda": "Sodimac",
        "precio": 3590,
        "url": "https://sodimac.falabella.com/..."
      },
      {
        "tienda": "Imperial",
        "precio": 3650,
        "url": "https://imperial.cl/..."
      }
    ]
  }
]
```

### Error Responses

- `400 Bad Request` - Falta el parámetro de búsqueda.
  ```json
  {
    "error": "El parámetro 'q' es requerido"
  }
  ```

- `500 Internal Server Error` - Falla catastrófica en el proceso de orquestación.
  ```json
  {
    "error": "Error interno del servidor al procesar el scraping"
  }
  ```

## Endpoint: Obtener todos los productos cacheados

**Endpoint:** `GET /api/productos/`

Retorna todos los productos disponibles en la base de datos sin disparar nuevos scrapers. Útil para rellenar catálogos estáticos o hacer data-mining en la caché local.

**Respuestas:**
### Success Response (200 OK)
```json
[
  {
    "id": "1",
    "nombre": "Taladro Percutor Makita 13mm",
    "categoria": "Herramientas",
    "marca": "Makita",
    "precios": [ ... ]
  }
]
```

## Arquitectura de Errores

Si un scraper individual (Ej. MercadoLibre) falla durante la petición `/api/productos/busqueda`, **la petición global no falla**. El servicio de *ScrapingService* captura el error del micro-scraper, registra un log (`Error extrayendo de MercadoLibre: Timeout`), y continúa agrupando la información de las tiendas que sí respondieron (Sodimac, Imperial).

## Flujo del Consumidor (Frontend)

**Ejemplo de Petición (JavaScript Frontend):**
```javascript
const query = 'cemento 25kg';
const response = await fetch(`http://localhost:3000/api/productos/busqueda?q=${encodeURIComponent(query)}`);
const productos = await response.json();

productos.forEach(prod => {
    console.log(`Producto unificado: ${prod.nombre}`);
    prod.precios.forEach(p => {
       console.log(` - Tienda: ${p.tienda} a $${p.precio}`);
    });
});
```
