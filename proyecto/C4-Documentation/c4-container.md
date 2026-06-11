# C4 Container-Level Documentation

## 1. Containers
- **Name:** Node.js API (Backend)
  - **Type:** API REST / Orquestador de Web Scraping
  - **Technology:** Node.js, Express, Playwright
  - **Deployment:** Servidor Node nativo o contenedor Docker
- **Name:** Base de Datos PostgreSQL
  - **Type:** Database
  - **Technology:** PostgreSQL 15, Prisma ORM
  - **Deployment:** Contenedor Docker

## 2. Container Diagram

```mermaid
C4Container
    title Container diagram for Plataforma de Precios

    Person(customer, "Usuario Constructor", "Cotiza materiales")

    System_Boundary(c1, "Plataforma de Precios") {
        Container(api, "API Application", "Node.js/Express", "Expone API REST, coordina el scraping y filtra los datos.")
        ContainerDb(db, "Database", "PostgreSQL 15", "Almacena historial de precios, caché de productos y normalización.")
    }

    System_Ext(sodimac, "Sodimac", "Sistema Externo")
    System_Ext(mercadolibre, "MercadoLibre", "Sistema Externo")
    System_Ext(imperial, "Imperial", "Sistema Externo")

    Rel(customer, api, "Realiza peticiones de búsqueda (via Frontend)", "JSON/HTTPS")
    Rel(api, db, "Lee/Escribe caché y productos unificados", "Prisma/TCP")
    Rel(api, sodimac, "Extrae HTML y Metadatos", "Playwright/HTTPS")
    Rel(api, mercadolibre, "Extrae HTML y Metadatos", "Playwright/HTTPS")
    Rel(api, imperial, "Extrae HTML y Metadatos", "Playwright/HTTPS")
```
