import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import apiRoutes from './routes/api.routes.js';
import { iniciarIndexadorProactivo } from './jobs/indexer.job.js';

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Serializar BigInt de Prisma a JSON correctamente
BigInt.prototype.toJSON = function () {
  return this.toString();
};

// Middlewares
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Rutas API
app.use('/api', apiRoutes);

// Servir Frontend Estático
const frontendPath = path.resolve('C:/Users/lucia/Documents/Dumas/Proyectos Tics/NewFrontend');
app.use(express.static(frontendPath));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor', detalle: err.message });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📋 Endpoints disponibles en http://localhost:${PORT}/api`);

  // Iniciar indexador proactivo: arranca casi inmediato (1s) para poblar la DB rápido
  iniciarIndexadorProactivo({ delayInicialMs: 1000, intervalHoras: 6 });
  console.log(`🔍 Indexador proactivo programado (inicio INMEDIATO, luego ciclos cada 6h)`);
});
