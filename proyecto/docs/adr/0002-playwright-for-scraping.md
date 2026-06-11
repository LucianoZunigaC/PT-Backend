# ADR-0002: Playwright para Web Scraping

## Status
Aceptado

## Context
Para obtener los precios de los distintos retailers, el sistema debe extraer datos HTML. Muchos de estos sitios (Sodimac, MercadoLibre) son Single Page Applications (SPAs) pesadas o utilizan tecnologías de protección anti-bot y validación de JavaScript en el cliente (Cloudflare, Datadome).
Realizar solicitudes HTTP tradicionales (con `axios` o `fetch`) y parsear con `cheerio` falla sistemáticamente porque el contenido de los precios se renderiza dinámicamente.

## Decision
Se decide utilizar **Playwright** para la capa de extracción de datos, en lugar de librerías simples de HTTP request.

## Rationale
- Playwright lanza un navegador Chromium/WebKit real (*headless*), asegurando que todo el JavaScript de la tienda objetivo se ejecute completamente y el DOM final contenga los precios correctos.
- Posee capacidades de espera implícita (`waitForSelector`), resolviendo la asincronía de los catálogos modernos.
- Es superior a Puppeteer en velocidad concurrente y manejo de múltiples contextos de navegación.

## Consequences
### Positivas
- Tasa de éxito de extracción de datos casi del 100%.
- Capacidad de simular iteraciones humanas (scroll, click) para bypassear protecciones.
### Negativas
- Consumo masivo de memoria RAM (cada instancia de Playwright es un navegador real).
- Tiempos de respuesta más lentos para el usuario final (la extracción puede tomar entre 3 a 10 segundos). 
- Requiere correr en entornos con suficientes recursos (servidores dedicados o contenedores amplios).
