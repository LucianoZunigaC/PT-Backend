# Arquitectura de Software - Backend

Este documento ofrece una visión de alto nivel sobre la estructura interna y la arquitectura técnica del Backend. 
*(Para diagramas C4, referirse a la carpeta `C4-Documentation/`).*

## Patrón Arquitectónico
El backend sigue una arquitectura en capas (Layered Architecture) fuertemente orientada a servicios, lo cual aísla la lógica de red (Routers) de la lógica de negocio (Services) y la lógica de infraestructura (Scrapers).

### 1. Capa de Red y Ruteo (`routes/` & `controllers/`)
- Se definen en Express.js.
- Valida los parámetros de entrada (`req.query.q`).
- Maneja los códigos de estado HTTP (200, 400, 500).
- Su única función es pasar la batuta a la capa de Servicios y retornar el JSON al cliente.

### 2. Capa de Servicios de Negocio (`services/`)
- **ScrapingService:** El director de la orquesta. Recibe un query, lanza llamadas asíncronas (`Promise.allSettled`) a todos los adaptadores de tienda, recolecta las respuestas crudas y las pasa al servicio de normalización.
- **NormalizationService:** Recibe cadenas sucias de texto, las tokeniza, limpia *stop-words*, estandariza unidades, y aplica matemáticas (Similitud Jaccard) para unificar diferentes registros que representan físicamente el mismo objeto de construcción.

### 3. Capa de Adaptadores de Infraestructura (`scrapers/`)
Patrón Adaptador / Strategy.
- Implementan clases que ocultan la lógica compleja de Playwright.
- Cada tienda (Sodimac, Imperial, MercadoLibre) requiere una navegación DOM completamente diferente (clases CSS distintas, XPaths distintos, estrategias anti-bot distintas).
- Su responsabilidad se limita a retornar un array de objetos "crudos" en formato genérico (`{ nombre, precio, url, tienda, marca, categoria }`).

### 4. Capa de Persistencia (`prisma/`)
- Base de datos relacional PostgreSQL.
- Abstraída a través de Prisma ORM.
- **Modelo Clave:** Separación estricta entre "Producto" (identidad única del material) e "HistorialPrecio" (variaciones de su costo en el tiempo en cada tienda).

## Escalabilidad Futura

1. **Colas Asíncronas (Message Broker):** Actualmente el scraping se hace de forma síncrona en la petición HTTP (bloqueando el hilo de red hasta 10 segundos). En una versión 2.0, el usuario enviaría una petición, recibiría un `jobId`, y usaríamos Redis/RabbitMQ + WebSockets o Long Polling para procesar el scraping en background y empujar los resultados al cliente cuando estén listos.
2. **Rotación de Proxies:** Para evitar baneos de IPs, la capa de Scrapers deberá integrar un servicio de Proxy Rotativo Residencial.
