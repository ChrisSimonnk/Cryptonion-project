import { Queue } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

export const callQueue = new Queue('call-queue', { connection: redisConnection });
export const aiQueue = new Queue('ai-queue', { connection: redisConnection });
export const documentQueue = new Queue('document-queue', { connection: redisConnection });
export const notificationQueue = new Queue('notification-queue', { connection: redisConnection });
