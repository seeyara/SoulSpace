import { redis } from './redis';

export async function checkRateLimit({
  key,
  window = 60, // seconds
  limit = 10,
}: {
  key: string;
  window?: number;
  limit?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `ratelimit:${key}:${Math.floor(now / window)}`;
  const current = (await redis.incr(windowKey)) as number;
  if (current === 1) {
    await redis.expire(windowKey, window);
  }
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
    reset: (Math.floor(now / window) + 1) * window - now,
  };
}
