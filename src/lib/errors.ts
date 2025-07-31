// Centralized error handling for API routes

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string, public field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class RateLimitError extends APIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

// Standard error response format
export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    field?: string;
    timestamp: string;
  };
}

// Error handler for API routes
export function handleAPIError(error: unknown): Response {
  const timestamp = new Date().toISOString();
  
  if (error instanceof APIError) {
    const response: ErrorResponse = {
      error: {
        message: error.message,
        code: error.code,
        timestamp,
        ...(error instanceof ValidationError && error.field && { field: error.field })
      }
    };
    
    return new Response(JSON.stringify(response), {
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Handle Supabase errors
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const supabaseError = error as { code: string; message: string };
    const response: ErrorResponse = {
      error: {
        message: 'Database operation failed',
        code: supabaseError.code,
        timestamp
      }
    };
    
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Generic error fallback
  const response: ErrorResponse = {
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp
    }
  };
  
  return new Response(JSON.stringify(response), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Utility to wrap async API handlers with error handling
export function withErrorHandler<TArgs extends unknown[]>(
  handler: (request: Request, ...args: TArgs) => Promise<Response>
) {
  return async (request: Request, ...args: TArgs): Promise<Response> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      console.error('API Error:', {
        url: request.url,
        method: request.method,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      return handleAPIError(error);
    }
  };
}