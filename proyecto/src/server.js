import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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

// Rutas
app.use('/api', apiRoutes);

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

  // Iniciar indexador proactivo: primer ciclo a los 2 minutos, luego cada 6 horas
  iniciarIndexadorProactivo({ delayInicialMs: 2 * 60_000, intervalHoras: 6 });
  console.log(`🔍 Indexador proactivo programado (inicio en 2 min, ciclos cada 6h)`);
});
