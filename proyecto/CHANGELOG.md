# Changelog

Todos los cambios notables en el Backend de la Plataforma de Precios serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [Unreleased]

### Añadido
- Mega-documentación C4 (Contexto, Contenedor, Componentes) en Mermaid.
- Documentación extensiva de la API, ADRs, Arquitectura y Guías de Desarrollo.

## [1.5.4] - 2026-05-25

### Añadido
- Filtro Dinámico Taxonómico: Los Scrapers ahora abortan el procesamiento de un producto si su jerarquía/migas de pan detecta que no es de construcción (ej. Juguetes, Infantil, Ropa).
- Smart Blacklist: Integración profunda del `normalization.service.js` para abortar todo el script si el string de búsqueda es completamente inválido.

### Modificado
- `scraping.service.js`: Refactorización mayor del algoritmo de Matching. Ahora utiliza el Coeficiente de Similitud de Jaccard con un umbral de 65%.

## [1.5.3] - 2026-05-24

### Añadido
- Sistema robusto de Normalización de Strings: Homologación de unidades (kg, lts, mts) a estándar.
- Eliminación de Stop Words dinámicas de tienda ("Añadir al carro", "Despacho Gratis", "Sodimac", "Imperial") que arruinaban el tokenizador de matching.

## [1.0.0] - 2026-05-20

### Añadido
- Arquitectura base del proyecto con Express.js.
- Conexión inicial a Base de Datos PostgreSQL usando Prisma ORM.
- Modelos básicos `Producto` y `HistorialPrecios`.
- Adaptadores iniciales de Playwright para extraer HTML crudo.
