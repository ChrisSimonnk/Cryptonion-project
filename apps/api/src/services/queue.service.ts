import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/env';

let aiQueue: Queue | null = null;
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 100, 2000),
    });
    redisClient.on('error', (err) => {
      // Safe Redis error logging to prevent crashes in disconnected test environments
      console.warn('[QueueService] Redis connection notice:', err.message);
    });
  }
  return redisClient;
}

export function getAIQueue(): Queue {
  if (!aiQueue) {
    aiQueue = new Queue('ai-queue', {
      connection: getRedisClient(),
    });
  }
  return aiQueue;
}

export async function dispatchMemoryExtractionJob(payload: {
  organizationId: string;
  aiEmployeeId: string;
  conversationId: string;
  messageId: string;
  leadId?: string | null;
}) {
  try {
    const queue = getAIQueue();
    await queue.add('extract-ai-memory', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
    });
  } catch (err: any) {
    // Non-blocking: background memory extraction queue failure should not break conversation response
    console.warn('[QueueService] Failed to enqueue extract-ai-memory job:', err.message);
  }
}
