import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

export const redisService = {
  get: (key: string) => redis.get(key),

  set: (key: string, value: string, ttlSeconds?: number) => {
    if (ttlSeconds !== undefined) {
      return redis.set(key, value, 'EX', ttlSeconds);
    }
    return redis.set(key, value);
  },

  del: (...keys: string[]) => redis.del(...keys),

  keys: (pattern: string) => redis.keys(pattern),

  exists: (key: string) => redis.exists(key),
};

export default redis;
