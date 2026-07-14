import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  ...(env.REDIS_URL.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {}),
});

export const pubRedis = new Redis(env.REDIS_URL, {
  ...(env.REDIS_URL.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {}),
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
  logger.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('🔌 Connected to Redis database (BullMQ)');
  logger.info('Connected to Redis (BullMQ)');
});

pubRedis.on('error', (err) => {
  console.error('❌ Redis Pub/Sub Publish client connection error:', err);
  logger.error('Redis Pub/Sub Publish client connection error:', err);
});

pubRedis.on('connect', () => {
  console.log('🔌 Connected to Redis database (Publish)');
  logger.info('Connected to Redis (Publish)');
});
