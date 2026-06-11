# Plataforma de Precios - Backend

Backend de la Plataforma de Precios de Materiales de Construcción, encargado de orquestar la extracción de datos (scraping) desde diversas tiendas (Sodimac, MercadoLibre, Imperial) y exponer una API REST para consultas, normalización y filtrado dinámico.

## Key Features

- **Extracción Dinámica (Scraping):** Extrae información en tiempo real usando Playwright con anti-bot stealth.
- **Filtrado Inteligente Anti-Basura:** Excluye automáticamente productos irrelevantes basándose en categorías dinámicas y taxonomías de las tiendas.
- **Normalización de Datos:** Estructura precios, imágenes, marcas y enlaces de diferentes fuentes bajo un modelo de datos unificado.
- **API REST:** Exposición de endpoints para búsqueda y consulta de productos.

## Tech Stack

- **Language**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL 15 (via Docker)
- **ORM**: Prisma ORM
- **Scraping**: Playwright, Puppeteer Extra (Stealth Plugin)
- **Deployment**: Docker Compose (Local/DB)

## Prerequisites

- Node.js 18 o superior
- Docker y Docker Compose (para la base de datos PostgreSQL)
- NPM o Yarn

## Getting Started

### 1. Clonar el Repositorio

```bash
git clone https://github.com/LucianoZunigaC/PT-Backend.git
cd PT-Backend/proyecto
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configuración del Entorno

Copia el archivo de entorno de ejemplo:

```bash
cp .env.example .env
```

Configura las variables de entorno principales en el archivo `.env`. Ejemplo:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | String de conexión a PostgreSQL (`postgresql://admin:password123@localhost:5433/plataforma_precios?schema=public`) |
| `PORT` | Puerto de la API (ej. `3000`) |

### 4. Configurar la Base de Datos

Inicia el contenedor de PostgreSQL usando Docker Compose:

```bash
docker-compose up -d
```
Esto levantará una instancia de PostgreSQL en el puerto `5433`.

Ejecuta las migraciones de Prisma para inicializar el esquema de la base de datos:

```bash
npx prisma migrate dev --name init
```

Genera el cliente de Prisma:

```bash
npx prisma generate
```

### 5. Iniciar el Servidor de Desarrollo

Para iniciar el servidor de la API REST:

```bash
npm run dev
```

El servidor estará escuchando en [http://localhost:3000](http://localhost:3000).

## Architecture

### Directory Structure

```
├── prisma/             # Esquema y migraciones de la base de datos
├── src/
│   ├── controllers/    # Controladores de la API (manejan las requests HTTP)
│   ├── routes/         # Definición de las rutas de Express
│   ├── scrapers/       # Scripts y lógica de scraping (Playwright)
│   │   ├── tiendas/    # Implementaciones por tienda (Sodimac, MercadoLibre, Imperial)
│   │   └── runner.js   # Orquestador de scraping
│   ├── services/       # Lógica de negocio, normalización y filtrado
│   ├── scripts/        # Scripts utilitarios (limpieza de BD, etc.)
│   └── server.js       # Entry point principal de la aplicación
└── docker-compose.yml  # Configuración de Docker para infraestructura local
```

### Request Lifecycle

1. Solicitud HTTP llega al enrutador de Express (`src/routes`).
2. El enrutador dirige la petición al controlador correspondiente (`src/controllers/productos.controller.js`).
3. El controlador solicita datos al servicio (`src/services/scraping.service.js` o consulta directa a la BD usando Prisma).
4. El servicio orquesta los scrapers, filtra basura mediante la normalización (`normalization.service.js`) y almacena/recupera resultados en PostgreSQL.
5. Se responde al cliente con un objeto JSON unificado.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo usando `nodemon` |
| `npm run scrape` | Ejecuta el script manual de scraping (`runner.js`) |
| `npm run clean:db` | Limpia los registros antiguos de la base de datos |
| `npm run clean:basura`| Ejecuta el script para eliminar elementos indeseados de la BD |

## Troubleshooting

### Problemas de Conexión a la Base de Datos
**Error:** `P1001: Can't reach database server at localhost:5433`
**Solución:**
1. Verifica que Docker esté corriendo.
2. Asegúrate de que el contenedor esté levantado: `docker ps`. Si no lo está, ejecuta `docker-compose up -d`.
3. Revisa la URL en tu `.env`.

### Problemas con Playwright
**Error:** `browserType.launch: Executable doesn't exist at...`
**Solución:**
Asegúrate de tener instalados los navegadores de Playwright:
```bash
npx playwright install
```
