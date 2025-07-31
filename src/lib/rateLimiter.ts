// Simple in-memory rate limiter
// For production, consider using Redis or Upstash

interface RateLimitConfig {
  requests: number;
  window: number; // in milliseconds
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class InMemoryRateLimit {
  private storage = new Map<string, RateLimitEntry>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up expired entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.storage.entries()) {
        if (now >= entry.resetTime) {
          this.storage.delete(key);
        }
      }
    }, 60000);
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.storage.get(identifier);

    if (!entry || now >= entry.resetTime) {
      // Create new entry or reset expired one
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.config.window
      };
      this.storage.set(identifier, newEntry);
      
      return {
        allowed: true,
        remaining: this.config.requests - 1,
        resetTime: newEntry.resetTime
      };
    }

    if (entry.count >= this.config.requests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: this.config.requests - entry.count,
      resetTime: entry.resetTime
    };
  }
}

// Rate limit configurations for different endpoints
export const rateLimitConfigs = {
  chatCompletion: { requests: 20, window: 60000 }, // 20 requests per minute
  chat: { requests: 50, window: 60000 }, // 50 requests per minute
  users: { requests: 30, window: 60000 }, // 30 requests per minute
  community: { requests: 100, window: 60000 }, // 100 requests per minute
} as const;

// Create rate limiters
const rateLimiters = {
  chatCompletion: new InMemoryRateLimit(rateLimitConfigs.chatCompletion),
  chat: new InMemoryRateLimit(rateLimitConfigs.chat),
  users: new InMemoryRateLimit(rateLimitConfigs.users),
  community: new InMemoryRateLimit(rateLimitConfigs.community),
};

// Get client identifier (IP address or user ID)
function getClientIdentifier(request: Request): string {
  // Try to get user ID from headers first
  const userId = request.headers.get('x-user-id');
  if (userId) return `user:${userId}`;

  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             request.headers.get('x-real-ip') || 
             'unknown';
  return `ip:${ip}`;
}

// Rate limiting middleware
export function withRateLimit<TArgs extends unknown[]>(
  limiterType: keyof typeof rateLimiters,
  handler: (request: Request, ...args: TArgs) => Promise<Response>
) {
  return async (request: Request, ...args: TArgs): Promise<Response> => {
    const identifier = getClientIdentifier(request);
    const limiter = rateLimiters[limiterType];
    const result = limiter.check(identifier);

    // Add rate limit headers to response
    const addRateLimitHeaders = (response: Response) => {
      response.headers.set('X-RateLimit-Limit', rateLimitConfigs[limiterType].requests.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
      return response;
    };

    if (!result.allowed) {
      const errorResponse = new Response(
        JSON.stringify({
          error: {
            message: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            resetTime: result.resetTime,
            timestamp: new Date().toISOString()
          }
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
      
      return addRateLimitHeaders(errorResponse);
    }

    // Execute the handler
    try {
      const response = await handler(request, ...args);
      return addRateLimitHeaders(response);
    } catch (error) {
      // If handler throws, still add rate limit headers to error response
      throw error;
    }
  };
}