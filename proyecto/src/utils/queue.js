import { Queue, Worker } from 'bullmq';
import logger from './logger.js';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
};

// Queue for scraper tasks
export const scraperQueue = new Queue('scraperQueue', { connection });

// Example worker setup
const scraperWorker = new Worker('scraperQueue', async (job) => {
  logger.info(`Processing job ${job.id} for scraper`);
  // Here we would trigger the specific scraper script based on job.data
  // Example: spawn Python script or run node scraper
}, { connection });

scraperWorker.on('completed', job => {
  logger.info(`Job ${job.id} has completed!`);
});

scraperWorker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} has failed with ${err.message}`);
});
