import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import logger from './utils/logger.js';
import { connectRedis } from './utils/redis.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración para serializar BigInt de Prisma a JSON correctamente
BigInt.prototype.toJSON = function () {
  return this.toString();
};

// Middlewares
app.use(cors());
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Rutas
app.use('/api', routes);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const startServer = async () => {
  try {
    await connectRedis();
    app.listen(PORT, () => {
      logger.info(`Servidor corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
