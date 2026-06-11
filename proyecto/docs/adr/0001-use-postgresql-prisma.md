# ADR-0001: Uso de PostgreSQL y Prisma como Capa de Datos

## Status
Aceptado

## Context
La Plataforma de Precios necesita almacenar miles de productos extraídos diariamente de múltiples proveedores (Sodimac, MercadoLibre, Imperial). Se requiere una solución robusta para mantener el historial de precios, manejar búsquedas concurrentes y realizar agrupaciones (matching) lógicas entre productos idénticos.

## Decision Drivers
- **Estructuración Relacional**: Los productos tienen múltiples precios a lo largo del tiempo, por lo que una base relacional es ideal para almacenar `Productos` (entidad maestra) e `HistorialPrecios` (registros).
- **Type Safety**: Al usar JavaScript/TypeScript en el backend, es crítico tener seguridad de tipos a nivel de consultas de base de datos.
- **Escalabilidad**: Soportar consultas de texto y futuros índices de similitud.

## Decision
Se utilizará **PostgreSQL** como motor principal de base de datos y **Prisma** como ORM (Object-Relational Mapper).

## Rationale
1. **PostgreSQL** es altamente robusto y nos permite en un futuro utilizar extensiones como `pg_trgm` para búsquedas difusas más eficientes si el modelo de similitud actual de Jaccard requiere optimización a nivel de base de datos.
2. **Prisma ORM** proporciona una experiencia de desarrollador (DX) superior gracias a su autocompletado y tipado estricto, reduciendo drásticamente los errores de SQL injection o referencias nulas.

## Consequences
### Positivas
- Fácil mantenimiento de las migraciones.
- Estandarización del modelo de datos (`schema.prisma`).
### Negativas
- Curva de aprendizaje inicial para la sintaxis de Prisma.
- Riesgo de cuellos de botella si no se indexan correctamente las columnas usadas para el matching de strings.
