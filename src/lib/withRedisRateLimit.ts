import { checkRateLimit } from './redisRateLimiter';
import { NextResponse } from 'next/server';

export function withRedisRateLimit({
  keyPrefix,
  limit = 10,
  window = 60,
  getKey,
}: {
  keyPrefix: string;
  limit?: number;
  window?: number;
  getKey?: (req: Request) => string;
}) {
  return function (handler: (req: Request) => Promise<Response>) {
    return async function (req: Request) {
      const userId = req.headers.get('x-user-id') || 'anonymous';
      const key = `${keyPrefix}:${getKey ? getKey(req) : userId}`;
      const result = await checkRateLimit({ key, limit, window });
      if (!result.allowed) {
        return NextResponse.json({
          error: 'Rate limit exceeded. Please wait and try again.',
          reset: result.reset,
          remaining: result.remaining,
        }, { status: 429 });
      }
      return handler(req);
    };
  };
}
