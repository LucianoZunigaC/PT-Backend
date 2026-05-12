import { createClient } from 'redis';
import logger from './logger.js';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));

let isConnected = false;

export const connectRedis = async () => {
  if (!isConnected) {
    await redisClient.connect();
    isConnected = true;
    logger.info('Connected to Redis');
  }
};

export const getCache = async (key) => {
  if (!isConnected) return null;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

export const setCache = async (key, value, exp = 3600) => {
  if (!isConnected) return;
  await redisClient.setEx(key, exp, JSON.stringify(value));
};

export default redisClient;
