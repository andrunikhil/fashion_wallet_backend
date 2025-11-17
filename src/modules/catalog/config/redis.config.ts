import { registerAs } from '@nestjs/config';
import { RedisOptions } from 'ioredis';

export const redisConfig = registerAs(
  'redis',
  (): RedisOptions => ({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: 'catalog:',
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  }),
);

export const cacheConfig = registerAs('cache', () => ({
  ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour default
  max: parseInt(process.env.CACHE_MAX_ITEMS || '1000', 10),
  store: 'ioredis',
}));
